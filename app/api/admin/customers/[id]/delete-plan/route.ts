import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("plan_id");

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required." }, { status: 400 });
    }

    // Verify customer exists
    const customer = await sql`SELECT id, username FROM customers WHERE id = ${id}`;
    if (customer.length === 0) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    // Verify plan exists
    const plan = await sql`
      SELECT id, total_gb FROM customer_plans
      WHERE id = ${planId} AND customer_id = ${id}
    `;
    if (plan.length === 0) {
      return NextResponse.json({ error: "Plan not found for this customer." }, { status: 404 });
    }

    // Delete customer plan
    await sql`DELETE FROM customer_plans WHERE id = ${planId} AND customer_id = ${id}`;

    // Log the action
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'deleted_customer_plan', 'customer_plan', ${planId}, ${'Removed plan ' + planId + ' from customer "' + customer[0].username + '"'})
    `;

    return NextResponse.json({ success: true, message: "Plan removed successfully." });
  } catch (error) {
    console.error("Delete customer plan error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
