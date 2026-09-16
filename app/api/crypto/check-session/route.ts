import { sql } from "@/lib/db";
import { checkBscUsdtBalance, autoSweepWithGasFunder } from "@/lib/crypto/bsc";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
    }

    // Look up session
    const sessions = await sql`
      SELECT 
        id, customer_id, plan_catalog_id, plan_name,
        expected_amount_usdt, received_amount_usdt, deposit_address,
        deposit_priv_key_encrypted, deposit_priv_key_iv, deposit_priv_key_tag,
        status, customer_identifier, expires_at
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

    // Check if session has expired
    if (new Date() > new Date(session.expires_at)) {
      await sql`
        UPDATE crypto_payment_sessions
        SET status = 'expired'
        WHERE id = ${sessionId} AND status = 'waiting'
      `;
      return NextResponse.json({
        status: "expired",
        message: "Checkout session expired. Please start a fresh order.",
      });
    }

    // Query on-chain BEP-20 USDT balance from public BSC RPC
    const onChainBalance = await checkBscUsdtBalance(session.deposit_address);
    const expectedAmount = Number(session.expected_amount_usdt);
    const minAcceptable = expectedAmount - 0.05; // 5-cent difference tolerance

    if (onChainBalance >= minAcceptable) {
      // Payment Verified On-Chain! Auto-activate plan & assign eSIM

      // 1. Check for available eSIM profile in stock
      const availableEsims = await sql`
        SELECT id, provider_name, activation_code
        FROM esims
        WHERE status = 'available'
        ORDER BY created_at ASC
        LIMIT 1
      `;

      let assignedEsimId: string | null = null;
      let hasEsim = false;

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

      // 5. Trigger automated gas funding & cold wallet sweep in background
      const coldWallet = process.env.COLD_WALLET_ADDRESS;
      if (coldWallet && session.deposit_priv_key_encrypted) {
        autoSweepWithGasFunder(
          session.deposit_priv_key_encrypted,
          session.deposit_priv_key_iv,
          session.deposit_priv_key_tag,
          coldWallet
        )
          .then(async (sweepResult) => {
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
          })
          .catch((err) => {
            console.error("Auto-sweep background error:", err);
          });
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

    // Still waiting for on-chain transfer
    return NextResponse.json({
      status: "waiting",
      receivedAmount: onChainBalance,
      expectedAmount,
      expiresAt: session.expires_at,
    });
  } catch (error) {
    console.error("Check crypto session error:", error);
    return NextResponse.json(
      { error: "Failed to verify session status." },
      { status: 500 }
    );
  }
}
