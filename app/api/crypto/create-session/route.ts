import { sql } from "@/lib/db";
import { verifyCustomerToken } from "@/lib/auth";
import { generateDepositWallet, encryptPrivateKey } from "@/lib/crypto/bsc";
import { CryptoCreateSessionSchema, validateBody } from "@/lib/security/schemas";
import { getClientIp, checkStandardRateLimit } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/errors";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    // 1. Rate Limiting
    const rateCheck = checkStandardRateLimit("public", clientIp);
    if (!rateCheck.allowed) {
      return rateCheck.response;
    }

    const customer = await verifyCustomerToken();
    if (!customer) {
      return NextResponse.json(
        { error: "Authentication required to initiate checkout." },
        { status: 401 }
      );
    }

    const rawBody = await request.json();

    // 2. Strict Schema Validation (rejection of unexpected properties)
    const validation = validateBody(CryptoCreateSessionSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }
    const { planId } = validation.data;

    // Ensure crypto_payment_sessions table exists
    await sql`
      CREATE TABLE IF NOT EXISTS crypto_payment_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        plan_catalog_id UUID REFERENCES plans_catalog(id) ON DELETE SET NULL,
        plan_name VARCHAR(255) NOT NULL,
        plan_price NUMERIC(10, 2) NOT NULL,
        gas_fee NUMERIC(10, 2) DEFAULT 0.10,
        expected_amount_usdt NUMERIC(10, 2) NOT NULL,
        received_amount_usdt NUMERIC(10, 4) DEFAULT 0,
        deposit_address VARCHAR(42) NOT NULL UNIQUE,
        deposit_priv_key_encrypted TEXT NOT NULL,
        deposit_priv_key_iv VARCHAR(32) NOT NULL,
        deposit_priv_key_tag VARCHAR(32) NOT NULL,
        tx_hash VARCHAR(66),
        status VARCHAR(30) DEFAULT 'waiting',
        customer_identifier VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        confirmed_at TIMESTAMP WITH TIME ZONE,
        swept_at TIMESTAMP WITH TIME ZONE,
        partial_expires_at TIMESTAMP WITH TIME ZONE
      )
    `;

    // Fetch plan details
    const catalogRows = await sql`
      SELECT id, name, price, is_on_sale, sale_price, data_amount_gb, validity_days
      FROM plans_catalog
      WHERE id = ${planId}
    `;

    if (catalogRows.length === 0) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const plan = catalogRows[0];
    const rawPrice = plan.is_on_sale && plan.sale_price ? plan.sale_price : plan.price;
    const planPrice = parseFloat(Number(rawPrice || 0).toFixed(2));
    const gasFee = 0.10; // Explicit user-end gas fee requested
    const totalUsdt = parseFloat((planPrice + gasFee).toFixed(2));

    // Generate unique EVM deposit keypair
    const { address, privateKey } = generateDepositWallet();
    const { encrypted, iv, tag } = encryptPrivateKey(privateKey);

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes validity window

    await sql`
      INSERT INTO crypto_payment_sessions (
        id, customer_id, plan_catalog_id, plan_name, plan_price,
        gas_fee, expected_amount_usdt, deposit_address,
        deposit_priv_key_encrypted, deposit_priv_key_iv, deposit_priv_key_tag,
        customer_identifier, status, created_at, expires_at
      ) VALUES (
        ${sessionId}, ${customer.id}, ${plan.id}, ${plan.name}, ${planPrice},
        ${gasFee}, ${totalUsdt}, ${address},
        ${encrypted}, ${iv}, ${tag},
        ${customer.username}, 'waiting', now(), ${expiresAt.toISOString()}
      )
    `;

    return NextResponse.json({
      success: true,
      sessionId,
      depositAddress: address,
      planName: plan.name,
      planPrice,
      gasFee,
      totalUsdt,
      dataAmountGb: plan.data_amount_gb,
      validityDays: plan.validity_days,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return safeErrorResponse(error, {
      clientMessage: "Failed to generate crypto payment session. Please try again.",
      context: { clientIp },
    });
  }
}
