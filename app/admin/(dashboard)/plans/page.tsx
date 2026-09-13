import { sql } from "@/lib/db";
import PlanManager from "./PlanManager";

export default async function PlansPage() {
  const plans = await sql`
    SELECT 
      id, 
      name, 
      data_amount_gb, 
      price, 
      validity_days, 
      description, 
      instagram_message, 
      is_highlighted, 
      is_on_sale, 
      sale_price, 
      badge_text, 
      is_active,
      created_at
    FROM plans_catalog
    WHERE is_active IS NOT FALSE
    ORDER BY data_amount_gb ASC
  `;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Plans Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure retail bundle quotas, prices, validity windows, and Instagram checkout text.
          </p>
        </div>
      </div>
      <PlanManager initialPlans={plans as any} />
    </div>
  );
}