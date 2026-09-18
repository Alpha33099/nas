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

    // Verify plan exists and inspect linked eSIM
    const plan = await sql`
      SELECT id, total_gb, esim_id FROM customer_plans
      WHERE id = ${planId} AND customer_id = ${id}
    `;
    if (plan.length === 0) {
      return NextResponse.json({ error: "Plan not found for this customer." }, { status: 404 });
    }

    const linkedEsimId = plan[0].esim_id;

    // Delete customer plan
    await sql`DELETE FROM customer_plans WHERE id = ${planId} AND customer_id = ${id}`;

    // If an eSIM was linked, check if any other plans for this customer still use it
    if (linkedEsimId) {
      const remainingPlans = await sql`
        SELECT count(*) as count FROM customer_plans
        WHERE customer_id = ${id} AND esim_id = ${linkedEsimId}
      `;
      const remainingCount = Number(remainingPlans[0]?.count || 0);

      // If no other plans reference this eSIM, release it back to available stock
      if (remainingCount === 0) {
        await sql`
          UPDATE esims 
          SET status = 'available', assigned_customer_id = NULL
          WHERE id = ${linkedEsimId}
        `;
      }
    }

    // Auto-promote next queued inactive plan if the active plan was deleted
    const { syncCustomerPlans } = await import("@/lib/plan-lifecycle");
    await syncCustomerPlans(id);

    return NextResponse.json({ success: true, message: "Plan removed successfully." });
  } catch (error) {
    console.error("Delete customer plan error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
