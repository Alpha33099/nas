import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { recordManualUsage, calculateCurrentUsage } from "@/lib/usage-server";
import { AdminBulkUpdateSchema, validateBody } from "@/lib/security/schemas";
import { getClientIp, checkStandardRateLimit } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/errors";
import { NextRequest, NextResponse } from "next/server";

// GET — Fetch all active customer plans
export async function GET() {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const activePlans = await sql`
      SELECT 
        cp.id,
        cp.total_gb,
        cp.used_gb,
        cp.manual_used_gb,
        cp.manual_updated_at,
        cp.daily_burn_rate,
        cp.start_date,
        cp.expiry_date,
        cp.status,
        cp.last_usage_update_at,
        cp.created_at,
        COALESCE(cp.plan_name, pc.name, 'Travel Data Plan') as plan_name,
        c.username as customer_username,
        c.display_name as customer_display_name
      FROM customer_plans cp
      LEFT JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
      JOIN customers c ON cp.customer_id = c.id
      WHERE cp.status = 'active'
      ORDER BY c.username ASC, cp.expiry_date ASC
    `;

    const plansWithLiveUsage = (activePlans as any[]).map((plan) => {
      const usage = calculateCurrentUsage(plan);
      return {
        ...plan,
        live_used_gb: usage.currentUsedGb,
        remaining_gb: usage.remainingGb,
        percent_used: usage.percentUsed,
        daily_rate: usage.dailyRate,
      };
    });

    return NextResponse.json({ success: true, plans: plansWithLiveUsage });
  } catch (error) {
    return safeErrorResponse(error, {
      clientMessage: "Failed to fetch active customer plans.",
    });
  }
}

// PUT — Batch update usage for multiple plans
export async function PUT(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // 1. Authenticated rate limit
    const rateCheck = checkStandardRateLimit("authenticated", admin.id);
    if (!rateCheck.allowed) {
      return rateCheck.response;
    }

    const rawBody = await request.json();

    // 2. Strict Schema Validation
    const validation = validateBody(AdminBulkUpdateSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }
    const { updates } = validation.data;

    // Update each plan with calibrated anchor and burn rate
    let updatedCount = 0;
    for (const update of updates) {
      await recordManualUsage(String(update.plan_id), update.used_gb, admin.id);
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
    });
  } catch (error) {
    return safeErrorResponse(error, {
      clientMessage: "Failed to process bulk usage update.",
      context: { clientIp },
    });
  }
}