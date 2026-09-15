"use client";

import { useState } from "react";
import { Sparkles, X, MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useCurrency } from "./CurrencyContext";

interface BuyButtonProps {
  plan: {
    id: string;
    slug?: string;
    name: string;
    price: number | string | null;
    sale_price?: number | string | null;
    is_on_sale?: boolean;
    data?: string;
    validity?: string;
    instagram_message?: string | null;
  };
}

export default function BuyButton({ plan }: BuyButtonProps) {
  const [showAiSoon, setShowAiSoon] = useState(false);
  const { formatPrice } = useCurrency();

  const activePrice = plan.is_on_sale && plan.sale_price ? plan.sale_price : plan.price;
  const priceDisplay = formatPrice(activePrice).formatted;

  const defaultMsg = `Hi ${siteConfig.name}! I want to buy the ${plan.name} eSIM plan (${priceDisplay}).`;
  const customMsg = plan.instagram_message
    ? `${plan.instagram_message} (${priceDisplay})`
    : defaultMsg;

  const encodedMsg = encodeURIComponent(customMsg);
  // Direct Instagram profile or direct DM link
  const instagramUrl = `https://ig.me/m/${siteConfig.instagramUsername}?text=${encodedMsg}`;

  return (
    <>
      <div className="flex gap-2">
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-navy-800 shadow-xs"
        >
          <MessageCircle size={15} />
          Order via Instagram
        </a>
        <button
          type="button"
          onClick={() => setShowAiSoon(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-500/30 bg-mist-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-navy-900 transition hover:bg-teal-50 hover:text-teal-700"
          title="Ask AI Assistant"
        >
          <Sparkles size={15} className="text-teal-600" />
          Ask AI
        </button>
      </div>

      {showAiSoon && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 px-4 pb-6 sm:items-center sm:pb-0 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-display text-lg font-semibold text-navy-900">
                  SafarSIM Assistant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiSoon(false)}
                className="text-ink-400 transition hover:text-ink-900"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mt-3 text-sm text-ink-600 leading-relaxed">
              Our 24/7 team is ready on Instagram to answer device compatibility questions and send your eSIM QR code instantly.
            </p>
            <div className="mt-4 rounded-xl bg-mist-50 p-3 border border-navy-900/5">
              <div className="text-xs text-ink-400">Selected Plan</div>
              <div className="text-sm font-bold text-navy-950 mt-0.5">
                {plan.name} eSIM — {priceDisplay}
              </div>
            </div>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 shadow-xs"
            >
              <MessageCircle size={16} />
              Chat on Instagram to Order
            </a>
          </div>
        </div>
      )}
    </>
  );
}
