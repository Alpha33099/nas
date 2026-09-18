import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { manuallyActivatePlan } from "@/lib/plan-lifecycle";
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
    const { plan_id } = body;

    if (!plan_id) {
      return NextResponse.json({ error: "Plan ID is required." }, { status: 400 });
    }

    const success = await manuallyActivatePlan(id, plan_id);
    if (!success) {
      return NextResponse.json({ error: "Plan not found or activation failed." }, { status: 404 });
    }

    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'activated_plan', 'customer_plan', ${plan_id}, ${'Manually activated plan ' + plan_id + ' for customer ' + id})
    `;

    return NextResponse.json({ success: true, message: "Plan activated successfully." });
  } catch (error) {
    console.error("Activate plan error:", error);
    return NextResponse.json({ error: "Failed to activate plan." }, { status: 500 });
  }
}
