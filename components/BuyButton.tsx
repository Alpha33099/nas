"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, MessageCircle, Zap } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useCurrency } from "./CurrencyContext";
import CheckoutModal from "./CheckoutModal";
import PaymentChoiceModal from "./PaymentChoiceModal";

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
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerUsername, setCustomerUsername] = useState("");

  // Check if returning from login with this plan selected -> auto-open crypto checkout
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("planId") === plan.id) {
        fetch("/api/auth/customer/me")
          .then((res) => res.json())
          .then((data) => {
            if (data.loggedIn && data.customer) {
              setCustomerUsername(data.customer.username);
              setIsCheckoutOpen(true);
            }
          })
          .catch(() => {});
      }
    }
  }, [plan.id]);

  const { formatPrice } = useCurrency();
  const activePrice = plan.is_on_sale && plan.sale_price ? plan.sale_price : plan.price;
  const priceDisplay = formatPrice(activePrice).formatted;
  const defaultMsg = `Hi ${siteConfig.name}! I want to buy the ${plan.name} eSIM plan (${priceDisplay}).`;
  const customMsg = plan.instagram_message
    ? `${plan.instagram_message} (${priceDisplay})`
    : defaultMsg;
  const instagramUrl = `https://ig.me/m/${siteConfig.instagramUsername}?text=${encodeURIComponent(customMsg)}`;

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsChoiceOpen(true)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition shadow-xs shadow-teal-600/20 active:scale-98"
        >
          <Zap size={14} className="fill-white" />
          <span>BUY NOW</span>
        </button>
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

      {/* Payment Method Selector Modal */}
      <PaymentChoiceModal
        plan={plan}
        isOpen={isChoiceOpen}
        onClose={() => setIsChoiceOpen(false)}
        onSelectCrypto={(_p, username) => {
          setCustomerUsername(username);
          setIsCheckoutOpen(true);
        }}
        redirectPath="/plans"
      />

      {/* Crypto Checkout Modal */}
      <CheckoutModal
        plan={plan}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        customerUsername={customerUsername}
      />

      {/* AI Assistant Modal */}
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
                onClick={() => setShowAiSoon(false)}
                className="text-ink-400 hover:text-navy-900 transition"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm text-ink-600">
              Need personalized advice for {plan.name}? Reach out directly on Instagram for immediate support:
            </p>
            <div className="mt-4 flex gap-2">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-navy-800"
              >
                <MessageCircle size={14} />
                Chat on Instagram
              </a>
              <button
                onClick={() => setShowAiSoon(false)}
                className="rounded-xl border border-navy-900/15 px-3 py-2 text-xs font-medium text-ink-600 hover:bg-mist-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
