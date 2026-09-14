export interface PlanUsageData {
  id?: string;
  total_gb: number | string;
  used_gb?: number | string | null;
  manual_used_gb?: number | string | null;
  manual_updated_at?: string | Date | null;
  daily_burn_rate?: number | string | null;
  start_date: string | Date;
  expiry_date?: string | Date | null;
  last_usage_update_at?: string | Date | null;
  created_at?: string | Date | null;
  status?: string;
}

export interface CalculatedUsage {
  currentUsedGb: number;
  remainingGb: number;
  manualGb: number;
  dailyRate: number;
  additionalGb: number;
  percentUsed: number;
  daysSinceAnchor: number;
  hoursSinceAnchor: number;
}

/**
 * Calculates live auto-incrementing data usage based on the admin's manual baseline anchor.
 *
 * Rules:
 * 1. Admin manually sets usage to `manual_used_gb` at `manual_updated_at`.
 * 2. At the moment of update, usage is EXACTLY `manual_used_gb`.
 * 3. Daily rate = `manual_used_gb / elapsed_days_from_start_to_update`.
 *    (e.g., 7 GB in 5 days = 1.4 GB/day; 1 GB in 6 days = 0.167 GB/day).
 * 4. As time continues after the update, usage auto-increments:
 *    `current_used = manual_used_gb + (daily_rate * days_since_update)`.
 * 5. When admin manually updates again, the new value becomes the new anchor and rate is recalibrated.
 */
export function calculateCurrentUsage(plan: PlanUsageData): CalculatedUsage {
  const totalGb = Math.max(0, Number(plan.total_gb) || 0);

  // Manual baseline set by admin
  const manualGb =
    plan.manual_used_gb !== null && plan.manual_used_gb !== undefined
      ? Number(plan.manual_used_gb)
      : plan.used_gb !== null && plan.used_gb !== undefined
      ? Number(plan.used_gb)
      : 0;

  if (plan.status !== "active" || totalGb <= 0 || manualGb <= 0) {
    const safeUsed = Math.min(Math.max(0, manualGb), totalGb);
    return {
      currentUsedGb: safeUsed,
      remainingGb: Math.max(0, Number((totalGb - safeUsed).toFixed(2))),
      manualGb: safeUsed,
      dailyRate: 0,
      additionalGb: 0,
      percentUsed: totalGb > 0 ? Math.round((safeUsed / totalGb) * 100) : 0,
      daysSinceAnchor: 0,
      hoursSinceAnchor: 0,
    };
  }

  const startDate = new Date(plan.start_date);
  const anchorTime = plan.manual_updated_at
    ? new Date(plan.manual_updated_at)
    : plan.last_usage_update_at
    ? new Date(plan.last_usage_update_at)
    : plan.created_at
    ? new Date(plan.created_at)
    : startDate;

  const now = new Date();

  // Days from start to when manual update was recorded
  const msFromStartToAnchor = Math.max(0, anchorTime.getTime() - startDate.getTime());
  const daysFromStartToAnchor = Math.max(msFromStartToAnchor / (1000 * 60 * 60 * 24), 0.5);

  // Daily burn rate established by the manual update
  const storedRate =
    plan.daily_burn_rate !== null && plan.daily_burn_rate !== undefined
      ? Number(plan.daily_burn_rate)
      : null;
  const dailyRate = storedRate && storedRate > 0 ? storedRate : manualGb / daysFromStartToAnchor;

  // Time elapsed SINCE the manual update
  const expiryDate = plan.expiry_date ? new Date(plan.expiry_date) : null;
  const effectiveNow = expiryDate && now > expiryDate ? expiryDate : now;
  const msSinceAnchor = Math.max(0, effectiveNow.getTime() - anchorTime.getTime());
  const daysSinceAnchor = msSinceAnchor / (1000 * 60 * 60 * 24);

  // Additional auto-accumulated data
  const additionalGb = dailyRate * daysSinceAnchor;
  const currentUsedGb = Math.min(Number((manualGb + additionalGb).toFixed(2)), totalGb);
  const remainingGb = Math.max(0, Number((totalGb - currentUsedGb).toFixed(2)));
  const percentUsed = totalGb > 0 ? Math.min(100, Math.round((currentUsedGb / totalGb) * 100)) : 0;

  return {
    currentUsedGb,
    remainingGb,
    manualGb: Number(manualGb.toFixed(2)),
    dailyRate: Number(dailyRate.toFixed(3)),
    additionalGb: Number(additionalGb.toFixed(2)),
    percentUsed,
    daysSinceAnchor: Number(daysSinceAnchor.toFixed(1)),
    hoursSinceAnchor: Math.floor(msSinceAnchor / (1000 * 60 * 60)),
  };
}
