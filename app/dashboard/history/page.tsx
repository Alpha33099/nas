import { sql } from "@/lib/db";
import { verifyCustomerToken } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PlanHistoryPage() {
  const customer = await verifyCustomerToken();
  if (!customer) redirect("/login");

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link href="/dashboard" className="text-xs font-semibold text-teal-600 hover:text-teal-700 mb-2 inline-block">
            ← Back to Active Plans
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Plan History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Archived data bundles from your completed trips
          </p>
        </div>

        <Link
          href="/dashboard/plans"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-xs shrink-0 self-start sm:self-auto"
        >
          <span>+</span>
          <span>Add New Plan</span>
        </Link>
      </div>

      {/* History Content */}
      {expiredPlans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Past Plans Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
            When your active travel plans expire or use all their allocated data, they will be archived here.
          </p>
          <Link
            href="/dashboard/plans"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-900 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
          >
            Browse Available Plans →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-left">
                <th className="px-5 py-3.5 font-semibold text-slate-600">Plan Name</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">Validity Period</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600">Final Usage</th>
                <th className="px-5 py-3.5 font-semibold text-slate-600 text-right">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expiredPlans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-800">{plan.plan_name} Plan</td>
                  <td className="px-5 py-4 text-slate-500 font-medium">
                    {new Date(plan.start_date).toISOString().split("T")[0]} →{" "}
                    {new Date(plan.expiry_date).toISOString().split("T")[0]}
                  </td>
                  <td className="px-5 py-4 text-slate-700 font-medium">
                    {Number(plan.used_gb).toFixed(2)} / {Number(plan.total_gb).toFixed(2)} GB
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-3xs uppercase tracking-wider">
                        Expired
                      </span>
                      <Link
                        href="/dashboard/plans"
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline"
                      >
                        Buy Again →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
