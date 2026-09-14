import { sql } from "@/lib/db";
import { verifyCustomerToken } from "@/lib/auth";
import { calculateCurrentUsage } from "@/lib/usage";
import Link from "next/link";

export default async function CustomerDashboardPage() {
  const customer = await verifyCustomerToken();
  if (!customer) return null;

  // 1. AUTO-EXPIRE: Automatically expire any plan that completed its validity OR used all GB
  await sql`
    UPDATE customer_plans
    SET status = 'expired'
    WHERE customer_id = ${customer.id}
      AND status = 'active'
      AND (expiry_date <= CURRENT_TIMESTAMP OR used_gb >= total_gb)
  `;

  const customerData = await sql`
    SELECT display_name FROM customers WHERE id = ${customer.id}
  `;

  const displayName = customerData[0]?.display_name || customer.username;

  // 2. Fetch Active plans only with calibration baseline
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
      pc.name as plan_name
    FROM customer_plans cp
    JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
    WHERE cp.customer_id = ${customer.id} AND cp.status = 'active'
    ORDER BY cp.expiry_date ASC
  `;

  // 3. Fetch Expired plans (history)
  const expiredPlans = await sql`
    SELECT 
      cp.id,
      cp.total_gb,
      cp.used_gb,
      cp.start_date,
      cp.expiry_date,
      pc.name as plan_name
    FROM customer_plans cp
    JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
    WHERE cp.customer_id = ${customer.id} AND cp.status = 'expired'
    ORDER BY cp.expiry_date DESC
  `;

  // Calculate usage for each active plan individually using live auto-rate engine (NEVER COMBINE)
  const plansWithUsage = (activePlans as any[]).map((plan) => {
    const usage = calculateCurrentUsage(plan);
    const displayedUsage = usage.currentUsedGb;
    const remainingGb = usage.remainingGb;
    const usagePercent = usage.percentUsed;

    const today = new Date();
    const expiry = new Date(plan.expiry_date);
    const daysRemaining = Math.max(
      0,
      Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      ...plan,
      displayedUsage,
      remainingGb,
      usagePercent,
      daysRemaining,
      dailyRate: usage.dailyRate,
      isLow: usagePercent >= 80,
      isExpiringSoon: daysRemaining <= 3,
    };
  });

  return (
    <div className="space-y-8">
      {/* ── Top Hero Greeting & Overview Banner ─────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white p-6 sm:p-8 shadow-lg border border-slate-700/50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-medium mb-3">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              {plansWithUsage.length > 0 ? "eSIM Active & Connected" : "No Active eSIM"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Your global data is live. Monitor real-time usage and stay connected.
            </p>
          </div>

          {/* Quick Metrics Bar — Never merges multiple plans */}
          {plansWithUsage.length > 0 && (
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shrink-0">
              {plansWithUsage.length === 1 ? (
                // Single plan: show exact remaining data and days
                <>
                  <div>
                    <p className="text-2xs text-slate-400 font-medium">Remaining Data</p>
                    <p className="text-2xl font-black text-white">
                      {plansWithUsage[0].remainingGb.toFixed(2)}{" "}
                      <span className="text-xs font-semibold text-teal-400">GB</span>
                    </p>
                  </div>
                  <div className="w-px h-10 bg-white/10"></div>
                  <div>
                    <p className="text-2xs text-slate-400 font-medium">Valid For</p>
                    <p className="text-2xl font-black text-white">
                      {plansWithUsage[0].daysRemaining}{" "}
                      <span className="text-xs font-semibold text-teal-400">Days</span>
                    </p>
                  </div>
                </>
              ) : (
                // Multiple plans: show count and roaming status (NEVER merge GBs)
                <>
                  <div>
                    <p className="text-2xs text-slate-400 font-medium">Active Bundles</p>
                    <p className="text-2xl font-black text-white">
                      {plansWithUsage.length}{" "}
                      <span className="text-xs font-semibold text-teal-400">Plans</span>
                    </p>
                  </div>
                  <div className="w-px h-10 bg-white/10"></div>
                  <div>
                    <p className="text-2xs text-slate-400 font-medium">Network</p>
                    <p className="text-xl font-bold text-white">
                      5G Global
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Active Plans Section ────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Active Plans</h2>
            <p className="text-xs text-slate-500">Each plan is tracked individually</p>
          </div>
          <Link
            href="/dashboard/plans"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/70 px-3.5 py-1.5 rounded-xl transition-colors"
          >
            + Add New Plan
          </Link>
        </div>

        {plansWithUsage.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center shadow-xs">
            <h3 className="text-base font-semibold text-slate-800">No active plans right now</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto mb-5">
              Ready for your next trip? Browse our high-speed data plans and activate in minutes.
            </p>
            <Link
              href="/dashboard/plans"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-all shadow-xs"
            >
              Browse Available Plans →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {plansWithUsage.map((plan) => (
              <div
                key={plan.id}
                className={`relative overflow-hidden bg-white rounded-3xl border p-6 sm:p-7 shadow-xs transition-all ${
                  plan.isExpiringSoon
                    ? "border-amber-300 ring-1 ring-amber-100"
                    : plan.isLow
                    ? "border-amber-300 ring-1 ring-amber-100"
                    : "border-slate-200"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{plan.plan_name} Plan</h3>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">High-Speed 4G / 5G Global Roaming</p>
                  </div>

                  <a
                    href={`https://ig.me/m/simvaya21?text=${encodeURIComponent(
                      `Hi Simvaya! I'd like to top up my ${plan.plan_name} plan for @${customer.username}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-teal-600 text-white transition-all shadow-xs shrink-0"
                  >
                    <svg className="w-3.5 h-3.5 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Top Up Data</span>
                  </a>
                </div>

                {/* Battery-style remaining data progress bar */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 mb-5">
                  <div className="flex justify-between items-baseline text-sm mb-2">
                    <div>
                      <span className="text-xs font-medium text-slate-500 block">Remaining Data</span>
                      <span className="text-xl font-black text-slate-800">
                        {plan.remainingGb.toFixed(2)}{" "}
                        <span className="text-xs font-bold text-slate-500">GB</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium text-slate-400">Data Used</span>
                      <p className="text-sm font-semibold text-slate-700">
                        {plan.displayedUsage.toFixed(2)} / {Number(plan.total_gb).toFixed(2)} GB ({plan.usagePercent}%)
                      </p>
                    </div>
                  </div>

                  {/* Progress bar: 100% full when fresh, drains down to 0% */}
                  <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        plan.isLow
                          ? "bg-amber-500"
                          : "bg-gradient-to-r from-teal-500 to-emerald-500"
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100 - plan.usagePercent, 100))}%` }}
                    />
                  </div>

                  {plan.isLow && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                      <span>Notice:</span>
                      <span>You have used over 80% of your data. Click Top Up to stay connected.</span>
                    </div>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-400 font-medium">Days Remaining</p>
                    <p className={`text-sm font-bold mt-0.5 ${plan.isExpiringSoon ? "text-amber-600" : "text-slate-800"}`}>
                      {plan.daysRemaining} Days
                    </p>
                  </div>

                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-400 font-medium">Expiry Date</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {new Date(plan.expiry_date).toISOString().split("T")[0]}
                    </p>
                  </div>

                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-400 font-medium">Activation Date</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {new Date(plan.start_date).toISOString().split("T")[0]}
                    </p>
                  </div>

                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-400 font-medium">Usage Synced</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {plan.last_usage_update_at
                        ? new Date(plan.last_usage_update_at).toISOString().split("T")[0]
                        : new Date().toISOString().split("T")[0]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Plan History Button (Right after Active Plans!) ────────── */}
      <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Plan History</h3>
            <p className="text-2xs text-slate-400">
              {expiredPlans.length > 0
                ? `${expiredPlans.length} past travel bundle${expiredPlans.length > 1 ? "s" : ""} archived`
                : "View past completed or expired travel bundles"}
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/history"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 text-xs font-semibold transition-colors border border-slate-200/60 hover:border-teal-200"
        >
          <span>View History</span>
          <span className="text-sm">→</span>
        </Link>
      </div>

      {/* ── eSIM Quick Installation Guide (Side-by-Side Cards) ───── */}
      <div id="esim-guide" className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
            eSIM
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Quick eSIM Setup Guide</h2>
            <p className="text-xs text-slate-500">Fast 3-step setup instructions for your smartphone</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* iOS Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <p className="font-bold text-slate-800 mb-2">Apple iPhone (iOS)</p>
            <ol className="space-y-1.5 text-slate-600 list-decimal list-inside">
              <li>Open <strong>Settings → Cellular / Mobile Service</strong>.</li>
              <li>Tap <strong>Add eSIM</strong> and enter activation details.</li>
              <li>Turn <strong>ON Data Roaming</strong> upon arrival.</li>
            </ol>
          </div>

          {/* Android Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <p className="font-bold text-slate-800 mb-2">Android (Samsung, Pixel, etc.)</p>
            <ol className="space-y-1.5 text-slate-600 list-decimal list-inside">
              <li>Open <strong>Settings → Connections → SIM Manager</strong>.</li>
              <li>Tap <strong>Add Mobile Plan / eSIM</strong>.</li>
              <li>Turn <strong>Roaming ON</strong> once you touch down.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── 24/7 Instagram Concierge Card ──────────────────────── */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-6 sm:p-7 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-base sm:text-lg">Need Immediate Assistance While Traveling?</h3>
          <p className="text-teal-100 text-xs max-w-lg">
            Our team is available on Instagram DM for instant support, top-ups, and destination questions.
          </p>
        </div>
        <a
          href="https://ig.me/m/simvaya21"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-colors shadow-xs shrink-0"
        >
          Message @simvaya21 ↗
        </a>
      </div>
    </div>
  );
}