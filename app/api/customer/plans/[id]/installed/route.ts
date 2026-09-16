import { sql } from "@/lib/db";
import { verifyCustomerToken } from "@/lib/auth";
import { getClientIp, checkStandardRateLimit } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/errors";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIp = getClientIp(request);

  try {
    const customer = await verifyCustomerToken();
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // 1. Authenticated rate limit
    const rateCheck = checkStandardRateLimit("authenticated", customer.id);
    if (!rateCheck.allowed) {
      return rateCheck.response;
    }

    const { id: planId } = await params;
    // 2. Strict ID format validation
    if (!planId || !/^[a-zA-Z0-9-]+$/.test(planId) || planId.length > 64) {
      return NextResponse.json({ error: "Invalid Plan ID format." }, { status: 400 });
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
    return safeErrorResponse(error, {
      clientMessage: "Failed to confirm installation. Please try again.",
      context: { clientIp },
    });
  }
}
