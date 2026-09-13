import { sql } from "@/lib/db";
import CreateCustomerForm from "./CreateCustomerForm";

export default async function CreateCustomerPage() {
  // Fetch plan catalog for the dropdown
  const plans = await sql`
    SELECT id, name, data_amount_gb, price, validity_days
    FROM plans_catalog
    ORDER BY data_amount_gb ASC
  `;

  // Fetch available eSIMs for the dropdown
  const availableEsims = await sql`
    SELECT id, provider_name
    FROM esims
    WHERE status = 'available'
    ORDER BY created_at DESC
  `;

  return (
    <div className="space-y-6">
      <div>
        <a
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors mb-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Customers</span>
        </a>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Provision New Customer
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Create an eSIM subscriber account, assign an initial data package, and link carrier credentials.
        </p>
      </div>

      <CreateCustomerForm
        plans={plans as any}
        availableEsims={availableEsims as any}
      />
    </div>
  );
}