import { sql } from "@/lib/db";
import { PlanCard } from "@/components/PlanCard";
import { Zap, ShieldCheck, RefreshCw } from "lucide-react";

export const revalidate = 60; // Revalidate every 60 seconds or on admin change

export const metadata = {
  title: "eSIM Plans & Pricing — Simwaya",
  description: "Browse high-speed international and Pakistan travel eSIM plans with instant digital QR activation.",
};

export default async function PlansPage() {
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
        instagram_message, 
        is_highlighted, 
        is_on_sale, 
        sale_price, 
        badge_text
      FROM plans_catalog
      WHERE is_active IS NOT FALSE
      ORDER BY data_amount_gb ASC
    `;
  } catch (error) {
    console.error("Error loading plans catalog:", error);
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          <Zap size={13} className="text-teal-600" />
          <span>Instant Digital Activation</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-950 sm:text-4xl mt-3">
          Choose Your eSIM Plan
        </h1>
        <p className="mt-3 text-base text-ink-600 leading-relaxed">
          High-speed 4G / LTE data packages tailored for light travel, heavy streaming, and everything in between. Pricing is shown in your local currency.
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="mt-8 flex flex-wrap gap-4 text-xs font-semibold text-ink-600 border-b border-navy-900/10 pb-6">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-teal-600" />
          <span>No Roaming Shock</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={16} className="text-teal-600" />
          <span>4G / LTE Fast Speeds</span>
        </div>
        <div className="flex items-center gap-1.5">
          <RefreshCw size={16} className="text-teal-600" />
          <span>Validity Starts on First Connect</span>
        </div>
      </div>

      {/* Plans Grid */}
      {plans.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : (
        <div className="mt-12 rounded-2xl border border-navy-900/10 bg-white p-12 text-center">
          <p className="text-ink-600">No active plans are currently listed. Please check back shortly or chat with us on Instagram.</p>
        </div>
      )}
    </section>
  );
}
