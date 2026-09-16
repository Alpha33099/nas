"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, MessageCircle, ChevronRight, Lock, X, Loader2 } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useCurrency } from "./CurrencyContext";

export interface PaymentChoicePlan {
  id: string;
  name: string;
  price: number | string | null;
  sale_price?: number | string | null;
  is_on_sale?: boolean;
  data?: string;
  validity?: string;
  instagram_message?: string | null;
}

interface PaymentChoiceModalProps {
  plan: PaymentChoicePlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectCrypto: (plan: PaymentChoicePlan, customerUsername: string) => void;
  customerUsername?: string;
  redirectPath?: string;
}

export default function PaymentChoiceModal({
  plan,
  isOpen,
  onClose,
  onSelectCrypto,
  customerUsername: propCustomerUsername = "",
  redirectPath = "/plans",
}: PaymentChoiceModalProps) {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [checkingAuth, setCheckingAuth] = useState(false);

  if (!isOpen || !plan) return null;

  const activePrice = plan.is_on_sale && plan.sale_price ? plan.sale_price : plan.price;
  const priceDisplay = formatPrice(activePrice).formatted;

  const defaultMsg = propCustomerUsername
    ? `Hi ${siteConfig.name}! I am logged in as @${propCustomerUsername} and want to purchase the ${plan.name} eSIM (${priceDisplay}).`
    : `Hi ${siteConfig.name}! I want to purchase the ${plan.name} eSIM plan (${priceDisplay}).`;

  const customMsg = plan.instagram_message
    ? `${plan.instagram_message} (${priceDisplay})`
    : defaultMsg;

  const encodedMsg = encodeURIComponent(customMsg);
  const instagramUrl = `https://ig.me/m/${siteConfig.instagramUsername}?text=${encodedMsg}`;

  async function handleCryptoClick() {
    if (!plan) return;

    if (propCustomerUsername) {
      onSelectCrypto(plan, propCustomerUsername);
      onClose();
      return;
    }

    setCheckingAuth(true);
    try {
      const res = await fetch("/api/auth/customer/me");
      const data = await res.json();
      if (data.loggedIn && data.customer) {
        onSelectCrypto(plan, data.customer.username);
        onClose();
      } else {
        onClose();
        router.push(`/login?redirect=${encodeURIComponent(redirectPath)}&planId=${plan.id}`);
      }
    } catch {
      onClose();
      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}&planId=${plan.id}`);
    } finally {
      setCheckingAuth(false);
    }
  }

  function handleInstagramClick() {
    onClose();
    window.open(instagramUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl shadow-slate-900/15 border border-slate-200/90 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Payment Method
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
              {plan.name}
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {plan.data ? `${plan.data} · ` : ""}
              <span className="font-semibold text-slate-800">{priceDisplay}</span>
              {plan.validity ? ` · ${plan.validity}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Payment Options */}
        <div className="space-y-3 mb-5">
          {/* Option 1: Instant Crypto */}
          <button
            type="button"
            onClick={handleCryptoClick}
            disabled={checkingAuth}
            className="w-full text-left p-4 rounded-2xl border border-slate-200/90 hover:border-slate-900 bg-slate-50/50 hover:bg-slate-50/90 transition-all group flex items-center justify-between gap-3.5 shadow-2xs active:scale-[0.99] disabled:opacity-60"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                {checkingAuth ? (
                  <Loader2 size={20} className="animate-spin text-teal-400" />
                ) : (
                  <Zap size={20} className="fill-teal-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-slate-950">
                    Pay with Crypto (USDT)
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                    Instant QR
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  BEP-20 on BNB Smart Chain · 0% Fee
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Instant confirmation & immediate profile activation
                </p>
              </div>
            </div>
            <ChevronRight
              size={18}
              className="text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0"
            />
          </button>

          {/* Option 2: Instagram Concierge */}
          <button
            type="button"
            onClick={handleInstagramClick}
            className="w-full text-left p-4 rounded-2xl border border-slate-200/90 hover:border-slate-900 bg-slate-50/50 hover:bg-slate-50/90 transition-all group flex items-center justify-between gap-3.5 shadow-2xs active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <MessageCircle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-slate-950">
                    Card, Bank & Local Pay
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                    Concierge
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Debit/Credit Cards, Bank, JazzCash & EasyPaisa
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Direct concierge order via Instagram @${siteConfig.instagramUsername}
                </p>
              </div>
            </div>
            <ChevronRight
              size={18}
              className="text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0"
            />
          </button>
        </div>

        {/* Security / Reassurance Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
          <Lock size={12} className="text-slate-400 shrink-0" />
          <span>256-bit Encrypted Checkout · Instant Activation · 24/7 Concierge</span>
        </div>
      </div>
    </div>
  );
}
