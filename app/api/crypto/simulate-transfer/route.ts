import { sql } from "@/lib/db";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
    }

    const sessions = await sql`
      SELECT 
        id, customer_id, plan_catalog_id, plan_name,
        expected_amount_usdt, deposit_address, status
      FROM crypto_payment_sessions
      WHERE id = ${sessionId}
    `;

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const session = sessions[0];
    const simulatedAmount = Number(session.expected_amount_usdt);

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

      await sql`
        UPDATE esims
        SET 
          status = 'assigned',
          assigned_customer_id = ${session.customer_id}
        WHERE id = ${assignedEsimId}
      `;
    }

    // 2. Fetch catalog details
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
        received_amount_usdt = ${simulatedAmount},
        confirmed_at = now()
      WHERE id = ${sessionId}
    `;

    return NextResponse.json({
      success: true,
      status: "confirmed",
      receivedAmount: simulatedAmount,
      hasEsim,
      planId: newPlanId,
      message: "Simulated transfer confirmed & plan auto-activated!",
    });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json({ error: "Simulation failed." }, { status: 500 });
  }
}
