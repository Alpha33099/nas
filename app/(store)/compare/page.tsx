import { sql } from "@/lib/db";
import { ComparePlansView } from "./ComparePlansView";

export const revalidate = 60;

export default async function ComparePlansPage() {
  let plans: any[] = [];
  try {
    plans = await sql`
      SELECT 
        id, 
        name, 
        data_amount_gb, 
        price, 
        validity_days, 
        description, 
        is_highlighted, 
        is_on_sale, 
        sale_price, 
        badge_text
      FROM plans_catalog
      WHERE is_active IS NOT FALSE
      ORDER BY data_amount_gb ASC
    `;
  } catch (error) {
    console.error(error);
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl font-extrabold text-navy-950 sm:text-4xl">
          Compare eSIM Plans
        </h1>
        <p className="mt-2 text-sm sm:text-base text-ink-600">
          See data allowances, prices in your local currency, and features side by side.
        </p>
      </div>

      <ComparePlansView plans={plans} />

      <p className="mt-6 text-center text-xs text-ink-400">
        Scroll horizontally on mobile devices to view all comparison columns.
      </p>
    </section>
  );
}
