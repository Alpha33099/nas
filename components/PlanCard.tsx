"use client";

import Link from "next/link";
import BuyButton from "./BuyButton";
import { useCurrency } from "./CurrencyContext";

export interface CatalogPlan {
  id: string;
  slug?: string;
  name: string;
  data_amount_gb: number | string;
  price: number | string;
  validity_days: number;
  description?: string | null;
  instagram_message?: string | null;
  is_highlighted?: boolean;
  is_on_sale?: boolean;
  sale_price?: number | string | null;
  badge_text?: string | null;
}

export function PlanCard({ plan }: { plan: CatalogPlan }) {
  const { formatPrice } = useCurrency();

  const isHighlighted = Boolean(plan.is_highlighted);
  const isOnSale = Boolean(plan.is_on_sale && plan.sale_price);

  const regularPrice = formatPrice(plan.price);
  const salePrice = isOnSale ? formatPrice(plan.sale_price) : null;

  const planSlug = plan.slug || (plan.name ? plan.name.toLowerCase().replace(/\s+/g, "-") : plan.id);

  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 hover:shadow-md ${
        isHighlighted
          ? "border-teal-500 bg-white shadow-[0_0_0_1px_rgba(20,184,166,0.3)] ring-2 ring-teal-500/20"
          : "border-navy-900/10 bg-white"
      }`}
    >
      {/* Badges */}
      <div className="absolute -top-3 left-6 flex items-center gap-1.5">
        {isHighlighted && (
          <span className="rounded-full bg-teal-500 px-3 py-1 text-[11px] font-bold tracking-wide text-navy-950 uppercase shadow-xs">
            Most Popular
          </span>
        )}
        {plan.badge_text && (
          <span className="rounded-full bg-navy-950 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white uppercase shadow-xs">
            {plan.badge_text}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl font-bold text-navy-950">{plan.name} eSIM</h3>
          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/50">
            {plan.data_amount_gb} GB Data
          </span>
        </div>

        <p className="mt-2 text-sm text-ink-600 line-clamp-2 min-h-[40px]">
          {plan.description || `Fast high-speed mobile internet with ${plan.validity_days} days validity.`}
        </p>

        {/* Pricing */}
        <div className="mt-5 pt-4 border-t border-navy-900/5">
          {isOnSale && salePrice ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-teal-600 tracking-tight">
                {salePrice.formatted}
              </span>
              <span className="text-sm font-medium text-ink-400 line-through">
                {regularPrice.formatted}
              </span>
            </div>
          ) : (
            <span className="text-3xl font-extrabold text-navy-950 tracking-tight">
              {regularPrice.formatted}
            </span>
          )}

          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs font-medium text-ink-500">
              Valid for {plan.validity_days} Days
            </span>
            {isOnSale && (
              <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                Special Offer
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-2 pt-2">
        <Link
          href={`/plans/${planSlug}`}
          className="rounded-xl border border-navy-900/15 px-4 py-2 text-center text-xs font-semibold text-navy-950 transition-colors hover:bg-navy-900/5"
        >
          View Plan Specs
        </Link>
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
  );
}
