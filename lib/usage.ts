export interface PlanUsageData {
  id?: string;
  total_gb: number | string;
  used_gb?: number | string | null;
  manual_used_gb?: number | string | null;
  manual_updated_at?: string | Date | null;
  daily_burn_rate?: number | string | null;
  start_date?: string | Date | null;
  expiry_date?: string | Date | null;
  last_usage_update_at?: string | Date | null;
  created_at?: string | Date | null;
  status?: string;
  expired_plans?: PlanUsageData[];
  historical_daily_rate?: number | null;
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
  rateSource: "manual_anchor" | "expired_history" | "catalog_default" | "none";
  incrementPer3MinMb: number;
  intervalsCount: number;
}

/**
 * Calculates a customer's average daily burn rate from their past expired plans.
 * Example:
 * Plan 1: 6 GB in 15 days (= 0.40 GB/day)
 * Plan 2: 12 GB in 30 days (= 0.40 GB/day)
 * Total: 18 GB in 45 days = 0.4000 GB/day
 */
export function calculateHistoricalBurnRate(expiredPlans: PlanUsageData[] = []): number | null {
  if (!expiredPlans || expiredPlans.length === 0) return null;

  let totalUsed = 0;
  let totalDays = 0;

  for (const plan of expiredPlans) {
    const totalGb = Number(plan.total_gb) || 0;
    const rawUsed =
      plan.manual_used_gb !== null && plan.manual_used_gb !== undefined && Number(plan.manual_used_gb) > 0
        ? Number(plan.manual_used_gb)
        : plan.used_gb !== null && plan.used_gb !== undefined && Number(plan.used_gb) > 0
        ? Number(plan.used_gb)
        : totalGb; // Expired plan is typically completed or exhausted

    if (!plan.start_date || !plan.expiry_date) continue;
    const start = new Date(plan.start_date).getTime();
    const end = new Date(plan.expiry_date).getTime();
    const days = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));

    if (rawUsed > 0 && days > 0) {
      totalUsed += rawUsed;
      totalDays += days;
    }
  }

  if (totalDays > 0 && totalUsed > 0) {
    return Number((totalUsed / totalDays).toFixed(4));
  }

  return null;
}

/**
 * Calculates live auto-incrementing data usage based on:
 * 1. Admin manual baseline anchor (if set)
 * 2. Customer historical burn rate from expired plans (if available)
 * 3. Default catalog pace fallback
 *
 * Increment Rule:
 * - A day has 1440 minutes = 480 intervals of 3 minutes each.
 * - Every 3 minutes, usage increases by exactly: (dailyRate / 480) GB.
 * - The 0.4 GB/day is smoothly distributed across the entire 24 hours, NOT added at once!
 */
export function calculateCurrentUsage(
  plan: PlanUsageData,
  expiredPlansContext?: PlanUsageData[]
): CalculatedUsage {
  const totalGb = Math.max(0, Number(plan.total_gb) || 0);

  // Manual baseline set by admin
  const manualGb =
    plan.manual_used_gb !== null && plan.manual_used_gb !== undefined
      ? Number(plan.manual_used_gb)
      : plan.used_gb !== null && plan.used_gb !== undefined
      ? Number(plan.used_gb)
      : 0;

  if (plan.status !== "active" || totalGb <= 0) {
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
      rateSource: "none",
      incrementPer3MinMb: 0,
      intervalsCount: 0,
    };
  }

  const startDate = plan.start_date ? new Date(plan.start_date) : new Date();
  const anchorTime = plan.manual_updated_at
    ? new Date(plan.manual_updated_at)
    : plan.last_usage_update_at
    ? new Date(plan.last_usage_update_at)
    : plan.created_at
    ? new Date(plan.created_at)
    : startDate;

  const now = new Date();

  // 1. Determine Daily Burn Rate:
  let dailyRate = 0;
  let rateSource: "manual_anchor" | "expired_history" | "catalog_default" | "none" = "none";

  const storedRate =
    plan.daily_burn_rate !== null && plan.daily_burn_rate !== undefined
      ? Number(plan.daily_burn_rate)
      : null;

  if (storedRate && storedRate > 0) {
    // A. Manually calibrated rate stored by admin
    dailyRate = storedRate;
    rateSource = "manual_anchor";
  } else if (manualGb > 0 && plan.manual_updated_at) {
    // B. Derived from admin's manual anchor vs elapsed days
    const msFromStartToAnchor = Math.max(0, anchorTime.getTime() - startDate.getTime());
    const daysFromStartToAnchor = Math.max(msFromStartToAnchor / (1000 * 60 * 60 * 24), 0.5);
    dailyRate = Number((manualGb / daysFromStartToAnchor).toFixed(4));
    rateSource = "manual_anchor";
  } else {
    // C. Take idea from expired plans (historical customer rate)!
    const expiredList = expiredPlansContext || plan.expired_plans || [];
    const historicalRate = plan.historical_daily_rate ?? calculateHistoricalBurnRate(expiredList);

    if (historicalRate && historicalRate > 0) {
      dailyRate = historicalRate;
      rateSource = "expired_history";
    } else {
      // D. Default catalog pace: total GB / validity days * 0.70
      const expiryDate = plan.expiry_date ? new Date(plan.expiry_date) : null;
      const validityDays = expiryDate
        ? Math.max(1, (expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        : 30;
      dailyRate = Number(((totalGb / validityDays) * 0.70).toFixed(4));
      rateSource = "catalog_default";
    }
  }

  // 2. Calculate smooth 3-minute interval increments throughout the day:
  // 1 day = 1440 minutes = 480 intervals of 3 minutes
  const expiryDate = plan.expiry_date ? new Date(plan.expiry_date) : null;
  const effectiveNow = expiryDate && now > expiryDate ? expiryDate : now;
  const msSinceAnchor = Math.max(0, effectiveNow.getTime() - anchorTime.getTime());
  const minutesSinceAnchor = msSinceAnchor / (1000 * 60);

  // Number of discrete 3-minute intervals elapsed
  const intervalsCount = Math.floor(minutesSinceAnchor / 3);
  const ratePer3Min = dailyRate / 480; // GB added every 3 minutes
  const incrementPer3MinMb = Number((ratePer3Min * 1024).toFixed(3)); // in MB

  // Auto-accumulated data (accumulates every 3 minutes throughout the day, not all at once!)
  const additionalGb = intervalsCount * ratePer3Min;
  const currentUsedGb = Math.min(Number((manualGb + additionalGb).toFixed(2)), totalGb);
  const remainingGb = Math.max(0, Number((totalGb - currentUsedGb).toFixed(2)));
  const percentUsed = totalGb > 0 ? Math.min(100, Math.round((currentUsedGb / totalGb) * 100)) : 0;
  const daysSinceAnchor = minutesSinceAnchor / 1440;

  return {
    currentUsedGb,
    remainingGb,
    manualGb: Number(manualGb.toFixed(2)),
    dailyRate: Number(dailyRate.toFixed(3)),
    additionalGb: Number(additionalGb.toFixed(2)),
    percentUsed,
    daysSinceAnchor: Number(daysSinceAnchor.toFixed(1)),
    hoursSinceAnchor: Math.floor(minutesSinceAnchor / 60),
    rateSource,
    incrementPer3MinMb,
    intervalsCount,
  };
}
