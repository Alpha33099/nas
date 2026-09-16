import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { autoSweepWithGasFunder } from "@/lib/crypto/bsc";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const targetColdWallet =
      body.targetAddress || process.env.COLD_WALLET_ADDRESS || "";

    if (!targetColdWallet || !targetColdWallet.startsWith("0x") || targetColdWallet.length !== 42) {
      return NextResponse.json(
        { error: "Valid BEP-20 Cold Wallet Address (0x...) is required to sweep funds." },
        { status: 400 }
      );
    }

    // Find confirmed sessions not yet swept
    const unsweptSessions = await sql`
      SELECT 
        id, deposit_address, deposit_priv_key_encrypted,
        deposit_priv_key_iv, deposit_priv_key_tag,
        received_amount_usdt
      FROM crypto_payment_sessions
      WHERE status = 'confirmed' AND (swept_at IS NULL)
      LIMIT 20
    `;

    if (unsweptSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unswept confirmed sessions found.",
        sweptCount: 0,
      });
    }

    const sweepResults = [];

    for (const session of unsweptSessions) {
      const result = await autoSweepWithGasFunder(
        session.deposit_priv_key_encrypted,
        session.deposit_priv_key_iv,
        session.deposit_priv_key_tag,
        targetColdWallet
      );

      if (result.success) {
        await sql`
          UPDATE crypto_payment_sessions
          SET 
            status = 'swept',
            tx_hash = ${result.txHash || null},
            swept_at = now()
          WHERE id = ${session.id}
        `;
        sweepResults.push({ id: session.id, success: true, txHash: result.txHash });
      } else {
        sweepResults.push({ id: session.id, success: false, error: result.error });
      }
    }

    return NextResponse.json({
      success: true,
      targetColdWallet,
      sweptCount: sweepResults.filter((r) => r.success).length,
      details: sweepResults,
    });
  } catch (error) {
    console.error("Admin crypto sweep error:", error);
    return NextResponse.json({ error: "Sweep operation failed." }, { status: 500 });
  }
}
