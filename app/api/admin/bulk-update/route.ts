import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { recordManualUsage, calculateCurrentUsage } from "@/lib/usage-server";
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
        pc.name as plan_name,
        c.username as customer_username,
        c.display_name as customer_display_name
      FROM customer_plans cp
      JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
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
    console.error("Fetch active plans error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// PUT — Batch update usage for multiple plans
export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body;

    // updates is an array of { plan_id, used_gb }
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "No updates provided." },
        { status: 400 }
      );
    }

    // Validate all entries
    for (const update of updates) {
      if (!update.plan_id || update.used_gb === undefined || update.used_gb === null) {
        return NextResponse.json(
          { error: "Each update must have plan_id and used_gb." },
          { status: 400 }
        );
      }
      if (Number(update.used_gb) < 0) {
        return NextResponse.json(
          { error: "Used GB cannot be negative." },
          { status: 400 }
        );
      }
    }

    // Update each plan with calibrated anchor and burn rate
    let updatedCount = 0;
    for (const update of updates) {
      await recordManualUsage(update.plan_id, Number(update.used_gb), admin.id);
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}