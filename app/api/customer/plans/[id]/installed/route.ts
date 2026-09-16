import { sql } from "@/lib/db";
import { verifyCustomerToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const customer = await verifyCustomerToken();
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id: planId } = await params;
    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required." }, { status: 400 });
    }

    // Verify ownership and update
    const result = await sql`
      UPDATE customer_plans
      SET 
        is_installed = TRUE,
        installed_at = now()
      WHERE id = ${planId} AND customer_id = ${customer.id}
      RETURNING id, is_installed, installed_at
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Plan not found or does not belong to you." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "eSIM profile confirmed as installed!",
      installedAt: result[0].installed_at,
    });
  } catch (error) {
    console.error("Confirm eSIM installation error:", error);
    return NextResponse.json(
      { error: "Failed to confirm installation." },
      { status: 500 }
    );
  }
}
