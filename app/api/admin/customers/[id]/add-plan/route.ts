import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { plan_catalog_id, start_date, esim_id } = body;

    if (!plan_catalog_id || !start_date) {
      return NextResponse.json({ error: "Plan and start date are required." }, { status: 400 });
    }

    // Verify customer exists
    const customer = await sql`SELECT id, username FROM customers WHERE id = ${id}`;
    if (customer.length === 0) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    // Get plan catalog info
    const catalog = await sql`
      SELECT id, data_amount_gb, validity_days FROM plans_catalog WHERE id = ${plan_catalog_id}
    `;
    if (catalog.length === 0) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const plan = catalog[0];

    // Calculate expiry
    const startDateObj = new Date(start_date);
    const expiryDate = new Date(startDateObj);
    expiryDate.setDate(expiryDate.getDate() + plan.validity_days);
    const expiryDateStr = expiryDate.toISOString().split("T")[0];

    // Create customer plan
    const planId = crypto.randomUUID();
    await sql`
      INSERT INTO customer_plans (
        id, customer_id, plan_catalog_id, esim_id, total_gb, used_gb,
        manual_used_gb, manual_updated_at, daily_burn_rate,
        start_date, expiry_date, status
      )
      VALUES (
        ${planId}, ${id}, ${plan_catalog_id}, ${esim_id || null}, ${plan.data_amount_gb}, 0,
        0, now(), 0,
        ${start_date}, ${expiryDateStr}, 'active'
      )
    `;

    // Log the action
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'assigned_plan', 'customer', ${id}, ${`Added plan to "${customer[0].username}"`})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add plan error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}