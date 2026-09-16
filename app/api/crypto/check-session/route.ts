import { sql } from "@/lib/db";
import { checkBscUsdtBalance, autoSweepWithGasFunder } from "@/lib/crypto/bsc";
import { CryptoCheckSessionSchema, validateBody } from "@/lib/security/schemas";
import { getClientIp, checkStandardRateLimit } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/errors";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    // 1. Rate Limiting
    const rateCheck = checkStandardRateLimit("public", clientIp);
    if (!rateCheck.allowed) {
      return rateCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const rawSessionId = searchParams.get("sessionId");

    // 2. Strict Schema Validation
    const validation = validateBody(CryptoCheckSessionSchema, { sessionId: rawSessionId });
    if (!validation.success) {
      return validation.response;
    }
    const { sessionId } = validation.data;

    // Look up session
    const sessions = await sql`
      SELECT 
        id, customer_id, plan_catalog_id, plan_name,
        expected_amount_usdt, received_amount_usdt, deposit_address,
        deposit_priv_key_encrypted, deposit_priv_key_iv, deposit_priv_key_tag,
        status, customer_identifier, expires_at, partial_expires_at
      FROM crypto_payment_sessions
      WHERE id = ${sessionId}
    `;

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const session = sessions[0];

    // If already confirmed, return instant success
    if (session.status === "confirmed" || session.status === "swept") {
      return NextResponse.json({
        status: "confirmed",
        receivedAmount: Number(session.received_amount_usdt),
        expectedAmount: Number(session.expected_amount_usdt),
        autoActivated: true,
        message: "Payment confirmed and eSIM plan active.",
      });
    }

    // Check if session or 10-minute partial payment window has expired
    const isMainExpired = new Date() > new Date(session.expires_at);
    const isPartialExpired = Boolean(session.partial_expires_at && new Date() > new Date(session.partial_expires_at));

    if (isMainExpired || isPartialExpired) {
      const onChainBal = await checkBscUsdtBalance(session.deposit_address);
      const coldWallet = process.env.COLD_WALLET_ADDRESS;

      // Auto-sweep any funds remaining on expired address to Cold Wallet
      if (onChainBal > 0.05 && coldWallet && session.deposit_priv_key_encrypted) {
        try {
          const sweepRes = await autoSweepWithGasFunder(
            session.deposit_priv_key_encrypted,
            session.deposit_priv_key_iv,
            session.deposit_priv_key_tag,
            coldWallet
          );
          if (sweepRes.success && sweepRes.txHash) {
            await sql`
              UPDATE crypto_payment_sessions
              SET status = 'expired_swept', tx_hash = ${sweepRes.txHash}, swept_at = now(), received_amount_usdt = ${onChainBal}
              WHERE id = ${sessionId}
            `;
          }
        } catch (err) {
          console.error("Expired auto-sweep error:", err);
        }
      } else {
        await sql`
          UPDATE crypto_payment_sessions
          SET status = 'expired'
          WHERE id = ${sessionId} AND status = 'waiting'
        `;
      }

      return NextResponse.json({
        status: "expired",
        receivedAmount: onChainBal,
        expectedAmount: Number(session.expected_amount_usdt),
        message: isPartialExpired
          ? "The 10-minute window to complete payment has expired. Any received funds have been securely transferred to cold storage."
          : "Checkout session expired. Please start a fresh order.",
      });
    }

    // Query on-chain BEP-20 USDT balance from public BSC RPC
    const onChainBalance = await checkBscUsdtBalance(session.deposit_address);
    const expectedAmount = Number(session.expected_amount_usdt);
    const minAcceptable = expectedAmount - 0.05; // 5-cent difference tolerance

    if (onChainBalance >= minAcceptable) {
      // Payment Verified On-Chain! Auto-activate plan & assign eSIM

      // 1. Resolve eSIM: Reuse existing customer eSIM (top-up) or allocate from stock
      let assignedEsimId: string | null = null;
      let hasEsim = false;

      // Check if this customer already has an assigned eSIM profile
      const existingCustomerEsims = await sql`
        SELECT id, provider_name, activation_code
        FROM esims
        WHERE assigned_customer_id = ${session.customer_id}
        LIMIT 1
      `;

      if (existingCustomerEsims.length > 0) {
        // Customer already has an eSIM -> attach this new plan as an instant top-up
        assignedEsimId = existingCustomerEsims[0].id;
        hasEsim = true;
      } else {
        // First-time buyer -> assign available eSIM profile from stock
        const availableEsims = await sql`
          SELECT id, provider_name, activation_code
          FROM esims
          WHERE status = 'available'
          ORDER BY created_at ASC
          LIMIT 1
        `;

        if (availableEsims.length > 0) {
          assignedEsimId = availableEsims[0].id;
          hasEsim = true;

          // Assign eSIM to this customer
          await sql`
            UPDATE esims
            SET 
              status = 'assigned',
              assigned_customer_id = ${session.customer_id}
            WHERE id = ${assignedEsimId}
          `;
        } else {
          // Inventory exhausted -> alert admin for urgent manual provisioning
          try {
            await sql`
              INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
              VALUES (
                NULL, 
                'inventory_depleted', 
                'crypto_session', 
                ${sessionId}, 
                ${'URGENT: Crypto payment confirmed for session ' + sessionId + ' but no available eSIM profiles remain in stock. Please assign an eSIM manually.'}
              )
            `;
          } catch (logErr) {
            console.error("Failed to log inventory alert:", logErr);
          }
        }
      }

      // 2. Fetch catalog details for validity calculation
      const catalog = await sql`
        SELECT data_amount_gb, validity_days
        FROM plans_catalog
        WHERE id = ${session.plan_catalog_id}
      `;

      const validityDays = catalog.length > 0 ? Number(catalog[0].validity_days) : 30;
      const dataGb = catalog.length > 0 ? Number(catalog[0].data_amount_gb) : 10;

      const startDate = new Date().toISOString().split("T")[0];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + validityDays);
      const expiryDateStr = expiryDate.toISOString().split("T")[0];

      const newPlanId = crypto.randomUUID();

      // 3. Insert and activate customer plan
      await sql`
        INSERT INTO customer_plans (
          id, customer_id, plan_catalog_id, esim_id, total_gb, used_gb,
          manual_used_gb, manual_updated_at, daily_burn_rate,
          start_date, expiry_date, status, created_at
        ) VALUES (
          ${newPlanId}, ${session.customer_id}, ${session.plan_catalog_id}, ${assignedEsimId},
          ${dataGb}, 0, 0, now(), 0,
          ${startDate}, ${expiryDateStr}, 'active', now()
        )
      `;

      // 4. Mark session confirmed
      await sql`
        UPDATE crypto_payment_sessions
        SET 
          status = 'confirmed',
          received_amount_usdt = ${onChainBalance},
          confirmed_at = now()
        WHERE id = ${sessionId}
      `;

      // 5. Execute automated gas funding & cold wallet sweep
      const coldWallet = process.env.COLD_WALLET_ADDRESS;
      if (coldWallet && session.deposit_priv_key_encrypted) {
        try {
          const sweepResult = await autoSweepWithGasFunder(
            session.deposit_priv_key_encrypted,
            session.deposit_priv_key_iv,
            session.deposit_priv_key_tag,
            coldWallet
          );
          if (sweepResult.success && sweepResult.txHash) {
            await sql`
              UPDATE crypto_payment_sessions
              SET status = 'swept', tx_hash = ${sweepResult.txHash}, swept_at = now()
              WHERE id = ${sessionId}
            `;
            console.log(`Auto-sweep successful for session ${sessionId}: tx ${sweepResult.txHash}`);
          } else {
            console.warn(`Auto-sweep pending for session ${sessionId}: ${sweepResult.error}`);
          }
        } catch (err) {
          console.error("Auto-sweep background error:", err);
        }
      }

      return NextResponse.json({
        status: "confirmed",
        receivedAmount: onChainBalance,
        expectedAmount,
        hasEsim,
        planId: newPlanId,
        autoActivated: true,
        message: hasEsim
          ? "Payment confirmed! Your eSIM profile is ready."
          : "Payment confirmed! Your plan is active; eSIM profile will be added shortly.",
      });
    }

    // PARTIAL PAYMENT HANDLING
    if (onChainBalance > 0) {
      const remainingAmount = Math.max(0, parseFloat((expectedAmount - onChainBalance).toFixed(2)));

      // If partial_expires_at is not set, set 10 minutes deadline from now
      let partialExpiry = session.partial_expires_at;
      if (!partialExpiry) {
        const tenMinsLater = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await sql`
          UPDATE crypto_payment_sessions
          SET 
            received_amount_usdt = ${onChainBalance},
            partial_expires_at = ${tenMinsLater}
          WHERE id = ${sessionId}
        `;
        partialExpiry = tenMinsLater;
      } else {
        await sql`
          UPDATE crypto_payment_sessions
          SET received_amount_usdt = ${onChainBalance}
          WHERE id = ${sessionId}
        `;
      }

      return NextResponse.json({
        status: "waiting",
        isPartial: true,
        receivedAmount: onChainBalance,
        remainingAmount,
        expectedAmount,
        partialExpiresAt: partialExpiry,
        expiresAt: session.expires_at,
      });
    }

    // Still waiting for on-chain transfer
    return NextResponse.json({
      status: "waiting",
      isPartial: false,
      receivedAmount: 0,
      remainingAmount: expectedAmount,
      expectedAmount,
      expiresAt: session.expires_at,
    });
  } catch (error) {
    return safeErrorResponse(error, {
      clientMessage: "Failed to verify session status. Please try again.",
      context: { clientIp },
    });
  }
}
