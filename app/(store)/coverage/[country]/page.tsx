import { notFound } from "next/navigation";
import Link from "next/link";
import { countries } from "@/data/countries";
import { sql } from "@/lib/db";
import { PlanCard } from "@/components/PlanCard";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const revalidate = 60;

export function generateStaticParams() {
  return countries.map((c) => ({ country: c.code.toLowerCase() }));
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  const match = countries.find((c) => c.code.toLowerCase() === country.toLowerCase());

  if (!match) {
    notFound();
  }

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
  } catch (err) {
    console.error(err);
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link
        href="/coverage"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition"
      >
        <ArrowLeft size={14} /> Back to Coverage List
      </Link>

      <div className="mt-6 rounded-2xl border border-navy-900/10 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-3xl font-bold text-navy-950">{match.name}</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700 border border-teal-200">
            <CheckCircle2 size={12} /> Supported
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-500 uppercase tracking-wider">{match.region}</p>
        <p className="mt-4 text-sm leading-relaxed text-ink-600">
          {match.notes || `Full high-speed 4G / LTE data roaming connectivity is supported across ${match.name}. Instant digital eSIM QR activation.`}
        </p>
      </div>

      {plans.length > 0 && (
        <div className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold text-navy-950">
              Available eSIM Plans for {match.name}
            </h2>
            <Link href="/plans" className="text-xs font-semibold text-teal-700 hover:underline">
              View all plans →
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
