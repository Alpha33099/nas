import { sql } from "@/lib/db";
import { verifyCustomerToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, planName, amountUsdt, network, walletAddress, txid, customerIdentifier } = body;

    if (!planName || !amountUsdt || !network) {
      return NextResponse.json({ error: "Missing required order fields." }, { status: 400 });
    }

    // Ensure crypto_orders table exists
    await sql`
      CREATE TABLE IF NOT EXISTS crypto_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        plan_catalog_id UUID,
        plan_name VARCHAR(255) NOT NULL,
        amount_usdt NUMERIC(10, 2) NOT NULL,
        network VARCHAR(50) NOT NULL,
        wallet_address VARCHAR(255) NOT NULL,
        txid VARCHAR(255),
        customer_identifier VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Check if customer is logged in
    const customer = await verifyCustomerToken();
    const customerId = customer?.id || null;

    const orderId = crypto.randomUUID();

    await sql`
      INSERT INTO crypto_orders (
        id, customer_id, plan_catalog_id, plan_name, amount_usdt,
        network, wallet_address, txid, customer_identifier, status,
        created_at, activated_at
      ) VALUES (
        ${orderId}, ${customerId}, ${planId || null}, ${planName}, ${amountUsdt},
        ${network}, ${walletAddress || ""}, ${txid || null}, ${customerIdentifier || customer?.username || "Anonymous"}, 'active',
        now(), now()
      )
    `;

    // If customer is logged in and plan exists, auto-activate plan immediately
    let autoActivated = false;
    if (customerId && planId) {
      const catalog = await sql`
        SELECT id, data_amount_gb, validity_days FROM plans_catalog WHERE id = ${planId}
      `;

      if (catalog.length > 0) {
        const cat = catalog[0];
        const startDate = new Date().toISOString().split("T")[0];
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (Number(cat.validity_days) || 30));
        const expiryDateStr = expiryDate.toISOString().split("T")[0];

        const planInstanceId = crypto.randomUUID();
        await sql`
          INSERT INTO customer_plans (
            id, customer_id, plan_catalog_id, total_gb, used_gb,
            manual_used_gb, manual_updated_at, daily_burn_rate,
            start_date, expiry_date, status
          ) VALUES (
            ${planInstanceId}, ${customerId}, ${cat.id}, ${cat.data_amount_gb}, 0,
            0, now(), 0,
            ${startDate}, ${expiryDateStr}, 'active'
          )
        `;
        autoActivated = true;
      }
    }

    // Record activity log for admin
    try {
      await sql`
        INSERT INTO activity_log (action, target_type, details)
        VALUES (
          'crypto_order_received',
          'order',
          ${`Crypto purchase received: ${planName} ($${amountUsdt} USDT via ${network}) - TXID: ${txid || "N/A"}`}
        )
      `;
    } catch {}

    return NextResponse.json({
      success: true,
      message: autoActivated ? "Plan automatically activated!" : "Crypto order received.",
      autoActivated,
      orderId,
    });
  } catch (error) {
    console.error("Crypto order error:", error);
    return NextResponse.json({ error: "Failed to record crypto order." }, { status: 500 });
  }
}
