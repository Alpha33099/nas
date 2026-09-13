import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
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
    const { plan_id, used_gb } = body;

    if (!plan_id || used_gb === undefined || used_gb === null) {
      return NextResponse.json({ error: "Plan ID and used GB are required." }, { status: 400 });
    }

    if (Number(used_gb) < 0) {
      return NextResponse.json({ error: "Used GB cannot be negative." }, { status: 400 });
    }

    // Verify the plan belongs to this customer
    const plan = await sql`
      SELECT id, total_gb FROM customer_plans
      WHERE id = ${plan_id} AND customer_id = ${id}
    `;
    if (plan.length === 0) {
      return NextResponse.json({ error: "Plan not found for this customer." }, { status: 404 });
    }

    // Update usage
    await sql`
      UPDATE customer_plans
      SET used_gb = ${Number(used_gb)}, last_usage_update_at = now()
      WHERE id = ${plan_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update usage error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}