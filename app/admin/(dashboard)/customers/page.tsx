import { sql } from "@/lib/db";
import CustomerList from "./CustomerList";
import Link from "next/link";

export default async function CustomersPage() {
  const customers = await sql`
    SELECT 
      c.id,
      c.username,
      c.display_name,
      c.last_login_at,
      c.created_at,
      c.first_login_city,
      c.first_login_country,
      c.first_login_locality,
      c.first_login_source,
      c.last_login_city,
      c.last_login_country,
      c.last_login_locality,
      c.last_login_source,
      c.last_login_ip,
      COALESCE(
        json_agg(
          json_build_object(
            'id', cp.id,
            'plan_name', pc.name,
            'total_gb', cp.total_gb,
            'used_gb', cp.used_gb,
            'manual_used_gb', cp.manual_used_gb,
            'manual_updated_at', cp.manual_updated_at,
            'daily_burn_rate', cp.daily_burn_rate,
            'start_date', cp.start_date,
            'expiry_date', cp.expiry_date,
            'last_usage_update_at', cp.last_usage_update_at,
            'created_at', cp.created_at,
            'status', cp.status
          )
        ) FILTER (WHERE cp.id IS NOT NULL),
        '[]'
      ) as plans
    FROM customers c
    LEFT JOIN customer_plans cp ON c.id = cp.customer_id
    LEFT JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage subscriber accounts, track live data usage, and provision new travel eSIMs.
          </p>
        </div>
        <Link
          href="/admin/customers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-xs self-start sm:self-auto"
        >
          <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Customer</span>
        </Link>
      </div>
      <CustomerList initialCustomers={customers as any} />
    </div>
  );
}