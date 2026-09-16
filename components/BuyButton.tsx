"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, MessageCircle, Zap } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useCurrency } from "./CurrencyContext";
import CheckoutModal from "./CheckoutModal";

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
  const router = useRouter();
  const [showAiSoon, setShowAiSoon] = useState(false);
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
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

  const encodedMsg = encodeURIComponent(customMsg);
  const instagramUrl = `https://ig.me/m/${siteConfig.instagramUsername}?text=${encodedMsg}`;

  async function handleCryptoSelect() {
    setIsChoiceOpen(false);
    setCheckingAuth(true);
    try {
      const res = await fetch("/api/auth/customer/me");
      const data = await res.json();
      if (data.loggedIn && data.customer) {
        setCustomerUsername(data.customer.username);
        setIsCheckoutOpen(true);
      } else {
        router.push(`/login?redirect=/plans&planId=${plan.id}`);
      }
    } catch {
      router.push(`/login?redirect=/plans&planId=${plan.id}`);
    } finally {
      setCheckingAuth(false);
    }
  }

  function handleInstagramSelect() {
    setIsChoiceOpen(false);
    window.open(instagramUrl, "_blank", "noopener,noreferrer");
  }

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
      {isChoiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60">
                  Select Payment Method
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
                  {plan.name} eSIM · {priceDisplay}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose how you would like to complete your order
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChoiceOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors text-sm font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Payment Options Grid */}
            <div className="space-y-3.5 mb-6">
              {/* Option 1: Crypto (Instant) */}
              <button
                type="button"
                onClick={handleCryptoSelect}
                disabled={checkingAuth}
                className="w-full text-left p-4 rounded-2xl border-2 border-teal-600/40 hover:border-teal-600 bg-teal-50/40 hover:bg-teal-50/80 transition-all group flex items-start gap-3.5 shadow-2xs active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-teal-600/30 group-hover:scale-105 transition-transform">
                  <Zap size={20} className="fill-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-900">
                      Pay with Crypto (USDT)
                    </h4>
                    <span className="text-3xs font-extrabold text-emerald-700 bg-emerald-100/80 border border-emerald-300/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      ⚡ Instant eSIM
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    BEP-20 USDT on BNB Smart Chain. Instant confirmation & immediate QR code delivery.
                  </p>
                </div>
              </button>

              {/* Option 2: Instagram (Cards, Bank, Other) */}
              <button
                type="button"
                onClick={handleInstagramSelect}
                className="w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-navy-900 bg-slate-50/50 hover:bg-slate-100/60 transition-all group flex items-start gap-3.5 active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <MessageCircle size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-navy-950">
                      Buy via Instagram Concierge
                    </h4>
                    <span className="text-3xs font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                      Card / Bank / Local
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Pay with Credit/Debit Card, Bank Transfer, JazzCash, EasyPaisa, or chat with support.
                  </p>
                </div>
              </button>
            </div>

            <p className="text-center text-3xs text-slate-400">
              Need help? Reach out on Instagram @{siteConfig.instagramUsername} anytime.
            </p>
          </div>
        </div>
      )}

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
