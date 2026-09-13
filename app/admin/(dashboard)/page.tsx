import { sql } from "@/lib/db";
import Link from "next/link";

export default async function AdminDashboardPage() {
  // Stats
  const customerCount = await sql`SELECT COUNT(*) as count FROM customers`;
  const activePlanCount = await sql`SELECT COUNT(*) as count FROM customer_plans WHERE status = 'active'`;
  const availableEsimCount = await sql`SELECT COUNT(*) as count FROM esims WHERE status = 'available'`;
  const planCatalogCount = await sql`SELECT COUNT(*) as count FROM plans_catalog`;

  // Plans expiring in 3 days
  const expiringSoon = await sql`
    SELECT cp.expiry_date, cp.total_gb, cp.used_gb, pc.name as plan_name,
           c.display_name, c.username
    FROM customer_plans cp
    JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
    JOIN customers c ON cp.customer_id = c.id
    WHERE cp.status = 'active'
      AND cp.expiry_date <= CURRENT_DATE + INTERVAL '3 days'
    ORDER BY cp.expiry_date ASC
    LIMIT 5
  `;

  // High usage plans (>=80%)
  const highUsage = await sql`
    SELECT cp.total_gb, cp.used_gb, pc.name as plan_name,
           c.display_name, c.username, c.id as customer_id
    FROM customer_plans cp
    JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
    JOIN customers c ON cp.customer_id = c.id
    WHERE cp.status = 'active'
      AND cp.total_gb > 0
      AND (cp.used_gb::numeric / cp.total_gb::numeric) >= 0.8
    ORDER BY (cp.used_gb::numeric / cp.total_gb::numeric) DESC
    LIMIT 5
  `;

  // Recent activity
  const recentActivity = await sql`
    SELECT al.action, al.details, al.created_at, a.username as admin_username
    FROM activity_log al
    LEFT JOIN admins a ON al.admin_id = a.id
    ORDER BY al.created_at DESC
    LIMIT 5
  `;

  const stats = [
    {
      label: "Total Customers",
      value: customerCount[0].count,
      subtext: "Registered accounts",
      href: "/admin/customers",
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      bg: "bg-blue-50 border-blue-100",
    },
    {
      label: "Active Plans",
      value: activePlanCount[0].count,
      subtext: "Live customer bundles",
      href: "/admin/bulk-update",
      icon: (
        <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      bg: "bg-teal-50 border-teal-100",
    },
    {
      label: "Available eSIMs",
      value: availableEsimCount[0].count,
      subtext: "Ready to assign",
      href: "/admin/esims",
      icon: (
        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
      bg: "bg-emerald-50 border-emerald-100",
    },
    {
      label: "Plan Catalog",
      value: planCatalogCount[0].count,
      subtext: "Active packages",
      href: "/admin/plans",
      icon: (
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      bg: "bg-purple-50 border-purple-100",
    },
  ];

  const actionLabels: Record<string, string> = {
    created_customer: "Created customer",
    deleted_customer: "Deleted customer",
    reset_password: "Reset password",
    assigned_plan: "Added plan",
    bulk_usage_update: "Bulk usage update",
    created_plan: "Created plan",
    updated_plan: "Updated plan",
    created_esim: "Added eSIM",
  };

  const actionBadgeColors: Record<string, string> = {
    created_customer: "bg-emerald-50 text-emerald-700 border-emerald-200",
    deleted_customer: "bg-rose-50 text-rose-700 border-rose-200",
    reset_password: "bg-amber-50 text-amber-700 border-amber-200",
    assigned_plan: "bg-blue-50 text-blue-700 border-blue-200",
    bulk_usage_update: "bg-purple-50 text-purple-700 border-purple-200",
    created_plan: "bg-teal-50 text-teal-700 border-teal-200",
    updated_plan: "bg-teal-50 text-teal-700 border-teal-200",
    created_esim: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time eSIM allocations, usage warnings, and provisioning controls.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-xs"
          >
            <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Customer</span>
          </Link>
          <Link
            href="/admin/bulk-update"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Update Usage</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:border-slate-300 hover:shadow-xs transition-all group relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  {stat.label}
                </p>
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {stat.value}
                </p>
                <p className="text-2xs font-medium text-slate-500 mt-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  {stat.subtext}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${stat.bg} border flex items-center justify-center group-hover:scale-105 transition-transform shrink-0`}>
                {stat.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions Bar */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Link
            href="/admin/customers/new"
            className="bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-teal-500 hover:shadow-xs transition-all group flex flex-col items-start text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-700 transition-colors">
              New Customer
            </p>
            <p className="text-2xs text-slate-400 mt-0.5">
              Provision account & plan
            </p>
          </Link>

          <Link
            href="/admin/bulk-update"
            className="bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-blue-500 hover:shadow-xs transition-all group flex flex-col items-start text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
              Update Usage
            </p>
            <p className="text-2xs text-slate-400 mt-0.5">
              Bulk update data usage
            </p>
          </Link>

          <Link
            href="/admin/esims"
            className="bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-emerald-500 hover:shadow-xs transition-all group flex flex-col items-start text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
              Add eSIM
            </p>
            <p className="text-2xs text-slate-400 mt-0.5">
              Input inventory credentials
            </p>
          </Link>

          <Link
            href="/admin/export"
            className="bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-purple-500 hover:shadow-xs transition-all group flex flex-col items-start text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-800 group-hover:text-purple-700 transition-colors">
              Export CSV
            </p>
            <p className="text-2xs text-slate-400 mt-0.5">
              Download customer report
            </p>
          </Link>
        </div>
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Expiring Soon */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Expiring Soon (≤ 3 Days)
                </h2>
                <p className="text-2xs text-slate-400">Plans ending shortly</p>
              </div>
            </div>
            {expiringSoon.length > 0 && (
              <span className="text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                {expiringSoon.length} {expiringSoon.length === 1 ? "plan" : "plans"}
              </span>
            )}
          </div>

          {expiringSoon.length === 0 ? (
            <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs font-medium text-slate-400">
                No active plans expiring within the next 3 days.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {expiringSoon.map((plan, i) => {
                const expiry = new Date(plan.expiry_date);
                const today = new Date();
                const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const countdownLabel = diffDays <= 0 ? "Expires today" : diffDays === 1 ? "1 day left" : `${diffDays} days left`;

                return (
                  <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {plan.display_name}
                        <span className="font-normal text-slate-400 ml-1.5">@{plan.username}</span>
                      </p>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        {plan.plan_name} • {Number(plan.used_gb).toFixed(1)} / {Number(plan.total_gb)} GB
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        {countdownLabel}
                      </span>
                      <p className="text-2xs text-slate-400 mt-0.5 font-mono">
                        {expiry.toISOString().split("T")[0]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* High Usage */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  High Usage Warning (≥ 80%)
                </h2>
                <p className="text-2xs text-slate-400">Close to data quota</p>
              </div>
            </div>
            {highUsage.length > 0 && (
              <span className="text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/80 px-2.5 py-0.5 rounded-full">
                {highUsage.length} {highUsage.length === 1 ? "customer" : "customers"}
              </span>
            )}
          </div>

          {highUsage.length === 0 ? (
            <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs font-medium text-slate-400">
                All customers are currently within safe usage thresholds.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {highUsage.map((plan, i) => {
                const pct = Math.min(100, Math.round((Number(plan.used_gb) / Number(plan.total_gb)) * 100));
                return (
                  <Link
                    key={i}
                    href={`/admin/customers/${plan.customer_id}`}
                    className="py-3 first:pt-0 last:pb-0 block group hover:bg-slate-50/70 -mx-2 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors truncate">
                          {plan.display_name}
                          <span className="font-normal text-slate-400 ml-1.5">@{plan.username}</span>
                        </p>
                        <p className="text-2xs text-slate-500">
                          {plan.plan_name} • {Number(plan.used_gb).toFixed(2)} / {Number(plan.total_gb)} GB
                        </p>
                      </div>
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md shrink-0">
                        {pct}%
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-rose-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Audit Trail</h2>
              <p className="text-2xs text-slate-400">Latest administrative actions</p>
            </div>
          </div>
          <Link
            href="/admin/activity-log"
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
          >
            <span>View Full Log</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-400">No activity recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivity.map((log, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`text-2xs font-semibold px-2 py-0.5 rounded-md border shrink-0 ${actionBadgeColors[log.action] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                    {actionLabels[log.action] || log.action}
                  </span>
                  <span className="text-xs text-slate-700 truncate">
                    {log.details}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-2xs text-slate-400 shrink-0 self-start sm:self-auto">
                  <span>by <strong className="text-slate-600 font-medium">{log.admin_username || "System"}</strong></span>
                  <span>•</span>
                  <span>{new Date(log.created_at).toISOString().replace("T", " ").substring(0, 16)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}