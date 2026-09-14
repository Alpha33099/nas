"use client";

import BuyButton from "@/components/BuyButton";
import { useCurrency } from "@/components/CurrencyContext";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Zap, Globe, Smartphone } from "lucide-react";

export function PlanDetailView({ plan }: { plan: any }) {
  const { formatPrice } = useCurrency();

  const isHighlighted = Boolean(plan.is_highlighted);
  const isOnSale = Boolean(plan.is_on_sale && plan.sale_price);

  const regularPrice = formatPrice(plan.price);
  const salePrice = isOnSale ? formatPrice(plan.sale_price) : null;

  const rows: [string, string][] = [
    ["Data Quota", `${plan.data_amount_gb} GB High-Speed Data`],
    ["Validity Period", `${plan.validity_days} Days (Starts on first connection)`],
    ["Coverage", "Supported Countries & Travel Destinations"],
    ["Network Speed", "4G / LTE Fast Local Carrier Partners"],
    ["Hotspot / Tethering", "Supported on compatible devices"],
    ["Voice Calls & SMS", "Data-Only (Use WhatsApp, FaceTime, Skype, Zoom)"],
    ["Activation Method", "Instant digital eSIM QR code delivery"],
    ["Device Compatibility", "All factory-unlocked eSIM compatible phones"],
  ];

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link
        href="/plans"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-navy-950 transition mb-6"
      >
        <ArrowLeft size={14} /> Back to all plans
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-navy-950">
              {plan.name} eSIM
            </h1>
            {isHighlighted && (
              <span className="rounded-full bg-teal-500 px-2.5 py-0.5 text-xs font-bold text-navy-950 uppercase">
                Most Popular
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-600">
            {plan.description || "Fast, reliable travel data connectivity for international travelers."}
          </p>
        </div>

        <div className="text-left sm:text-right">
          {isOnSale && salePrice ? (
            <div>
              <div className="text-3xl font-extrabold text-teal-600">
                {salePrice.formatted}
              </div>
              <div className="text-sm text-ink-400 line-through">
                {regularPrice.formatted}
              </div>
            </div>
          ) : (
            <div className="text-3xl font-extrabold text-navy-950">
              {regularPrice.formatted}
            </div>
          )}
          <span className="text-xs text-ink-400">All taxes included</span>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-navy-900/10 bg-white p-3 text-center">
          <Zap size={18} className="mx-auto text-teal-600 mb-1" />
          <div className="text-xs font-bold text-navy-950">{plan.data_amount_gb} GB</div>
          <div className="text-[10px] text-ink-400">Total Data</div>
        </div>
        <div className="rounded-xl border border-navy-900/10 bg-white p-3 text-center">
          <ShieldCheck size={18} className="mx-auto text-teal-600 mb-1" />
          <div className="text-xs font-bold text-navy-950">{plan.validity_days} Days</div>
          <div className="text-[10px] text-ink-400">Active Validity</div>
        </div>
        <div className="rounded-xl border border-navy-900/10 bg-white p-3 text-center">
          <Globe size={18} className="mx-auto text-teal-600 mb-1" />
          <div className="text-xs font-bold text-navy-950">Global</div>
          <div className="text-[10px] text-ink-400">Coverage</div>
        </div>
        <div className="rounded-xl border border-navy-900/10 bg-white p-3 text-center">
          <Smartphone size={18} className="mx-auto text-teal-600 mb-1" />
          <div className="text-xs font-bold text-navy-950">eSIM QR</div>
          <div className="text-[10px] text-ink-400">Digital Delivery</div>
        </div>
      </div>

      {/* Plan Specs Table */}
      <div className="mt-8 divide-y divide-navy-900/10 rounded-2xl border border-navy-900/10 bg-white overflow-hidden shadow-xs">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:justify-between hover:bg-mist-50/50 transition"
          >
            <span className="text-xs sm:text-sm font-semibold text-ink-600">{label}</span>
            <span className="text-xs sm:text-sm font-medium text-navy-950 sm:text-right">{value}</span>
          </div>
        ))}
      </div>

      {/* Order CTA */}
      <div className="mt-8 rounded-2xl bg-navy-950 p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Ready to order this plan?</h3>
            <p className="text-xs text-mist-200/80 mt-1">
              Connect with our Instagram team to confirm payment and receive your activation QR instantly.
            </p>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <BuyButton
              plan={{
                id: plan.id,
                name: plan.name,
                price: plan.price,
                sale_price: plan.sale_price,
                is_on_sale: plan.is_on_sale,
                data: `${plan.data_amount_gb}GB`,
                validity: `${plan.validity_days} Days`,
                instagram_message: plan.instagram_message,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
