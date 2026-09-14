import { sql } from "@/lib/db";
import { calculateCurrentUsage, PlanUsageData } from "./usage";

export { calculateCurrentUsage };
export type { PlanUsageData };

/**
 * Record a manual usage update from the admin.
 * Calculates new burn rate and anchors the usage at the exact value entered.
 */
export async function recordManualUsage(planId: string, manualGb: number, adminId?: string) {
  const planRows = await sql`
    SELECT id, total_gb, start_date, customer_id
    FROM customer_plans
    WHERE id = ${planId}
  `;

  if (planRows.length === 0) {
    throw new Error("Plan not found.");
  }

  const plan = planRows[0];
  const startDate = new Date(plan.start_date);
  const now = new Date();

  const msFromStart = Math.max(0, now.getTime() - startDate.getTime());
  const daysFromStart = Math.max(msFromStart / (1000 * 60 * 60 * 24), 0.5);

  const dailyRate = manualGb > 0 ? Number((manualGb / daysFromStart).toFixed(4)) : 0;

  await sql`
    UPDATE customer_plans
    SET 
      used_gb = ${Number(manualGb)},
      manual_used_gb = ${Number(manualGb)},
      manual_updated_at = now(),
      daily_burn_rate = ${dailyRate},
      last_usage_update_at = now()
    WHERE id = ${planId}
  `;

  if (adminId) {
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (
        ${adminId},
        'updated_usage',
        'customer_plan',
        ${planId},
        ${'Manually updated usage to ' + manualGb + ' GB (Calibrated burn rate: ' + dailyRate.toFixed(2) + ' GB/day)'}
      )
    `;
  }

  return {
    success: true,
    manualGb,
    dailyRate,
  };
}
