"use client";

import Link from "next/link";
import { useCurrency } from "@/components/CurrencyContext";

export function ComparePlansView({ plans }: { plans: any[] }) {
  const { formatPrice } = useCurrency();

  const rows: { label: string; get: (p: any) => string }[] = [
    { label: "Data Quota", get: (p) => `${p.data_amount_gb} GB` },
    {
      label: "Price",
      get: (p) => {
        const active = p.is_on_sale && p.sale_price ? p.sale_price : p.price;
        return formatPrice(active).formatted;
      },
    },
    { label: "Validity", get: (p) => `${p.validity_days} Days` },
    { label: "Network Speed", get: () => "4G / LTE" },
    { label: "Hotspot Sharing", get: () => "Supported" },
    { label: "Calls & SMS", get: () => "Data-Only (WhatsApp/VoIP)" },
    { label: "Activation", get: () => "Digital QR Code" },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-navy-900/10 bg-white shadow-xs">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-44 bg-mist-50 px-5 py-4 font-display text-navy-950 font-bold">
              Feature
            </th>
            {plans.map((plan) => {
              const activePrice = plan.is_on_sale && plan.sale_price ? plan.sale_price : plan.price;
              const formatted = formatPrice(activePrice).formatted;
              return (
                <th
                  key={plan.id}
                  className={`px-4 py-4 text-center font-display ${
                    plan.is_highlighted ? "bg-teal-500/10 text-navy-950" : "bg-mist-50 text-navy-950"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    {plan.is_highlighted && (
                      <span className="rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-bold text-navy-950 uppercase">
                        Most Popular
                      </span>
                    )}
                    <span className="text-base font-bold">{plan.name}</span>
                    <span className="text-xs font-semibold text-teal-700">{formatted}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.label} className={rowIndex % 2 === 0 ? "bg-white" : "bg-mist-50/50"}>
              <td className="sticky left-0 z-10 w-44 bg-inherit px-5 py-3.5 font-semibold text-navy-950 border-r border-navy-900/5">
                {row.label}
              </td>
              {plans.map((plan) => (
                <td
                  key={plan.id}
                  className={`px-4 py-3.5 text-center text-xs sm:text-sm text-ink-600 ${
                    plan.is_highlighted ? "bg-teal-500/5 font-medium" : ""
                  }`}
                >
                  {row.get(plan)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="sticky left-0 z-10 w-44 bg-white px-5 py-4 border-r border-navy-900/5"></td>
            {plans.map((plan) => {
              const slug = plan.name ? plan.name.toLowerCase().replace(/\s+/g, "-") : plan.id;
              return (
                <td key={plan.id} className="px-4 py-4 text-center">
                  <Link
                    href={`/plans/${slug}`}
                    className="inline-flex items-center justify-center rounded-xl bg-navy-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-navy-800"
                  >
                    Select Plan
                  </Link>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
