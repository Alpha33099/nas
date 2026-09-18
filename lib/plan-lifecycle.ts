import { sql } from "@/lib/db";
import { calculateCurrentUsage, PlanUsageData } from "@/lib/usage";
import crypto from "crypto";

/**
 * Synchronizes and enforces customer plan lifecycle rules:
 * 1. Only ONE plan can be active at a time per customer.
 * 2. If the active plan expires (by validity date OR data usage exhaustion), it is marked 'expired'.
 * 3. When an active plan expires, the oldest queued 'inactive' plan automatically activates.
 * 4. An activated plan's validity window begins fresh on the day of activation (start_date = today, expiry_date = today + validity_days).
 */
export async function syncCustomerPlans(customerId: string): Promise<{
  expiredCount: number;
  activatedPlanId: string | null;
}> {
  let expiredCount = 0;
  let activatedPlanId: string | null = null;

  // 1. Fetch active plans for this customer
  const activePlans = await sql`
    SELECT * FROM customer_plans
    WHERE customer_id = ${customerId} AND status = 'active'
    ORDER BY created_at ASC
  `;

  // Fetch past expired plans context for historical burn rate
  const expiredPlansContext = await sql`
    SELECT id, total_gb, used_gb, manual_used_gb, start_date, expiry_date
    FROM customer_plans
    WHERE customer_id = ${customerId} AND status = 'expired'
  `;

  // If there are multiple active plans, normalize by keeping the first active and queuing the rest
  if (activePlans.length > 1) {
    const extraActive = activePlans.slice(1);
    for (const extra of extraActive) {
      await sql`
        UPDATE customer_plans
        SET status = 'inactive', used_gb = 0, manual_used_gb = 0, daily_burn_rate = 0
        WHERE id = ${extra.id}
      `;
    }
  }

  const primaryActive = activePlans[0] || null;

  if (primaryActive) {
    const totalGb = Number(primaryActive.total_gb);
    const usage = calculateCurrentUsage(primaryActive as any, expiredPlansContext as any);
    const effectiveUsedGb = Math.max(Number(primaryActive.used_gb || 0), usage.currentUsedGb);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const expiryStr = primaryActive.expiry_date
      ? new Date(primaryActive.expiry_date).toISOString().split("T")[0]
      : todayStr;

    const isDateExpired = expiryStr < todayStr;
    const isDataExhausted = totalGb > 0 && effectiveUsedGb >= totalGb;

    if (isDateExpired || isDataExhausted) {
      // Expire the currently active plan
      await sql`
        UPDATE customer_plans
        SET 
          status = 'expired',
          used_gb = ${Math.min(totalGb, Number(effectiveUsedGb.toFixed(2)))},
          manual_used_gb = ${Math.min(totalGb, Number(effectiveUsedGb.toFixed(2)))}
        WHERE id = ${primaryActive.id}
      `;
      expiredCount++;
    }
  }

  // 2. Check if the customer currently has an active plan
  const remainingActive = await sql`
    SELECT id FROM customer_plans
    WHERE customer_id = ${customerId} AND status = 'active'
    LIMIT 1
  `;

  // 3. If NO active plan, promote the oldest queued 'inactive' plan
  if (remainingActive.length === 0) {
    const nextQueued = await sql`
      SELECT id, validity_days, total_gb, esim_id, plan_name
      FROM customer_plans
      WHERE customer_id = ${customerId} AND status = 'inactive'
      ORDER BY created_at ASC
      LIMIT 1
    `;

    if (nextQueued.length > 0) {
      const planToActivate = nextQueued[0];
      const validityDays = Number(planToActivate.validity_days || 30);

      const startDateObj = new Date();
      const startDateStr = startDateObj.toISOString().split("T")[0];
      const expiryDateObj = new Date(startDateObj);
      expiryDateObj.setDate(expiryDateObj.getDate() + validityDays);
      const expiryDateStr = expiryDateObj.toISOString().split("T")[0];

      // Auto-attach to customer's active eSIM if not linked
      let targetEsimId = planToActivate.esim_id;
      if (!targetEsimId) {
        const customerEsim = await sql`
          SELECT id FROM esims WHERE assigned_customer_id = ${customerId} LIMIT 1
        `;
        if (customerEsim.length > 0) {
          targetEsimId = customerEsim[0].id;
        }
      }

      await sql`
        UPDATE customer_plans
        SET 
          status = 'active',
          start_date = ${startDateStr},
          expiry_date = ${expiryDateStr},
          used_gb = 0,
          manual_used_gb = 0,
          manual_updated_at = now(),
          last_usage_update_at = now(),
          daily_burn_rate = 0,
          esim_id = COALESCE(esim_id, ${targetEsimId})
        WHERE id = ${planToActivate.id}
      `;

      activatedPlanId = planToActivate.id;
    }
  }

  return { expiredCount, activatedPlanId };
}

/**
 * Assigns a new plan to a customer.
 * If the customer already has an active plan, the new plan is added as 'inactive' (queued).
 */
export async function assignCustomerPlan(params: {
  customerId: string;
  planCatalogId?: string | null;
  planName: string;
  dataGb: number;
  validityDays: number;
  esimId?: string | null;
  forceActive?: boolean;
}): Promise<{
  planId: string;
  status: "active" | "inactive";
  startDate: string;
  expiryDate: string;
}> {
  const { customerId, planCatalogId, planName, dataGb, validityDays, esimId, forceActive } = params;

  // Check if customer already has an active plan
  const activeExisting = await sql`
    SELECT id FROM customer_plans
    WHERE customer_id = ${customerId} AND status = 'active'
    LIMIT 1
  `;

  const shouldBeActive = activeExisting.length === 0 || forceActive === true;
  const status = shouldBeActive ? "active" : "inactive";

  const startDateObj = new Date();
  const startDateStr = startDateObj.toISOString().split("T")[0];
  const expiryDateObj = new Date(startDateObj);
  expiryDateObj.setDate(expiryDateObj.getDate() + validityDays);
  const expiryDateStr = expiryDateObj.toISOString().split("T")[0];

  const planId = crypto.randomUUID();

  await sql`
    INSERT INTO customer_plans (
      id, customer_id, plan_catalog_id, plan_name, validity_days,
      esim_id, total_gb, used_gb, manual_used_gb, manual_updated_at,
      daily_burn_rate, start_date, expiry_date, status, created_at
    ) VALUES (
      ${planId}, ${customerId}, ${planCatalogId || null}, ${planName}, ${validityDays},
      ${esimId || null}, ${dataGb}, 0, 0, now(),
      0, ${startDateStr}, ${expiryDateStr}, ${status}, now()
    )
  `;

  return {
    planId,
    status,
    startDate: startDateStr,
    expiryDate: expiryDateStr,
  };
}

/**
 * Manually promotes an inactive plan to active.
 * Existing active plan is archived to 'expired'.
 */
export async function manuallyActivatePlan(customerId: string, planId: string): Promise<boolean> {
  const planToActivate = await sql`
    SELECT id, validity_days FROM customer_plans
    WHERE id = ${planId} AND customer_id = ${customerId}
  `;

  if (planToActivate.length === 0) return false;

  // Expire current active plans
  await sql`
    UPDATE customer_plans
    SET status = 'expired'
    WHERE customer_id = ${customerId} AND status = 'active'
  `;

  const validityDays = Number(planToActivate[0].validity_days || 30);
  const startDateObj = new Date();
  const startDateStr = startDateObj.toISOString().split("T")[0];
  const expiryDateObj = new Date(startDateObj);
  expiryDateObj.setDate(expiryDateObj.getDate() + validityDays);
  const expiryDateStr = expiryDateObj.toISOString().split("T")[0];

  await sql`
    UPDATE customer_plans
    SET 
      status = 'active',
      start_date = ${startDateStr},
      expiry_date = ${expiryDateStr},
      used_gb = 0,
      manual_used_gb = 0,
      manual_updated_at = now(),
      last_usage_update_at = now(),
      daily_burn_rate = 0
    WHERE id = ${planId}
  `;

  return true;
}
