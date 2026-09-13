import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
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
        cp.expiry_date,
        cp.last_usage_update_at,
        pc.name as plan_name,
        c.username as customer_username,
        c.display_name as customer_display_name
      FROM customer_plans cp
      JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
      JOIN customers c ON cp.customer_id = c.id
      WHERE cp.status = 'active'
      ORDER BY c.username ASC, cp.expiry_date ASC
    `;

    return NextResponse.json({ success: true, plans: activePlans });
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

    // Update each plan
    let updatedCount = 0;
    for (const update of updates) {
      await sql`
        UPDATE customer_plans
        SET used_gb = ${Number(update.used_gb)},
            last_usage_update_at = now()
        WHERE id = ${update.plan_id} AND status = 'active'
      `;
      updatedCount++;
    }

    // Log the action
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'bulk_usage_update', 'customer_plan', NULL, ${`Updated usage for ${updatedCount} plan(s)`})
    `;

    return NextResponse.json({
      success: true,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}