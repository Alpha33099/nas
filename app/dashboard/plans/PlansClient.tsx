"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import CheckoutModal from "@/components/CheckoutModal";

interface Plan {
  id: string;
  name: string;
  data_amount_gb: string | number;
  price: string | number;
  validity_days: number;
  description: string | null;
  instagram_message: string | null;
  is_highlighted?: boolean;
  is_on_sale?: boolean;
  sale_price?: string | number | null;
  badge_text?: string | null;
}

interface Props {
  plans: Plan[];
}

type FilterCategory = "all" | "short" | "extended" | "heavy";

export default function PlansClient({ plans }: Props) {
  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  // Modal state
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ask AI widget state
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello! I'm your Simvaya Travel Assistant. Where are you heading, and how many days is your trip? I'll recommend the best data bundle for you.",
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isAiOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiMessages, isAiOpen, isAiLoading]);

  // Filter plans based on selected tab
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const days = Number(plan.validity_days);
      const gb = Number(plan.data_amount_gb);

      if (activeFilter === "short") return days <= 15;
      if (activeFilter === "extended") return days >= 21;
      if (activeFilter === "heavy") return gb >= 10;
      return true;
    });
  }, [plans, activeFilter]);

  // Handle Buy click: Copy message + show toast + open Instagram DM in new tab
  async function handleBuy(plan: Plan) {
    const regularPrice = Number(plan.price);
    const isOnSale = Boolean(plan.is_on_sale) && plan.sale_price !== null && plan.sale_price !== undefined && Number(plan.sale_price) > 0;
    const effectivePrice = isOnSale ? Number(plan.sale_price) : regularPrice;
    const defaultMsg = `Hi Simvaya! I'd like to purchase the ${plan.name} (${Number(plan.data_amount_gb)} GB, $${effectivePrice.toFixed(2)}${isOnSale ? " - Special Offer" : ""}) plan.`;
    const message = plan.instagram_message || defaultMsg;

    try {
      await navigator.clipboard.writeText(message);
      setToastMessage(`Copied Instagram order inquiry for ${plan.name}! Opening Instagram...`);
    } catch {
      setToastMessage(`Opening Instagram for ${plan.name}...`);
    }

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);

    const igUrl = `https://ig.me/m/simvaya21?text=${encodeURIComponent(message)}`;
    window.open(igUrl, "_blank", "noopener,noreferrer");
  }

  // Handle Ask AI question
  async function handleAskAi(question?: string) {
    const q = question || aiInput.trim();
    if (!q || isAiLoading) return;

    const newMessages = [...aiMessages, { sender: "user" as const, text: q }];
    setAiMessages(newMessages);
    setAiInput("");
    setIsAiLoading(true);

    try {
      const history = aiMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        text: m.text,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setAiMessages((prev) => [...prev, { sender: "ai", text: data.reply }]);
      } else {
        setAiMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text:
              data.error ||
              "Our 5GB ($14.99 for 21 days) and 10GB ($24.99 for 30 days) plans are great for most trips! Tap 'Buy on IG' to order or message @simvaya21 on Instagram.",
          },
        ]);
      }
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Our 5GB ($14.99) bundle is the traveler favorite! Message @simvaya21 on Instagram for personalized trip assistance.",
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  }

  return (
    <div className="space-y-8 pb-16">
      {/* ── Page Header & Roaming Perks Hero ────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white p-6 sm:p-8 shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              Instant eSIM Delivery & Roaming
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Global Travel Data Plans
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
              Fast, dependable cellular connectivity in 140+ destinations. No physical SIM swaps, no roaming bill shocks.
            </p>
          </div>

          {/* Quick Roaming Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <p className="text-lg font-black text-teal-400">140+</p>
              <p className="text-3xs text-slate-300 font-medium mt-0.5">Countries Covered</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <p className="text-lg font-black text-white">5G / 4G</p>
              <p className="text-3xs text-slate-300 font-medium mt-0.5">High-Speed Roaming</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center col-span-2 sm:col-span-1">
              <p className="text-lg font-black text-emerald-400">100%</p>
              <p className="text-3xs text-slate-300 font-medium mt-0.5">Hotspot Allowed</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Filter Tabs ────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeFilter === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200"
          }`}
        >
          All Plans ({plans.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("short")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeFilter === "short"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200"
          }`}
        >
          Short Trips (7–15 Days)
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("extended")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeFilter === "extended"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200"
          }`}
        >
          Long Vacation (21–30 Days)
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("heavy")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeFilter === "heavy"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200"
          }`}
        >
          High Data (10GB+)
        </button>
      </div>

      {/* ── Floating Toast Message ──────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs sm:text-sm font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-200">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Plans Pricing Cards Grid ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => {
          const gb = Number(plan.data_amount_gb);
          const regularPrice = Number(plan.price);
          const isOnSale = Boolean(plan.is_on_sale) && plan.sale_price !== null && plan.sale_price !== undefined && Number(plan.sale_price) > 0;
          const effectivePrice = isOnSale ? Number(plan.sale_price) : regularPrice;
          const pricePerGb = gb > 0 ? (effectivePrice / gb).toFixed(2) : "0.00";
          const isHighlighted = Boolean(plan.is_highlighted);

          const isPopular = isHighlighted || plan.name.toLowerCase().includes("5gb");
          const isBestValue = !isPopular && (plan.name.toLowerCase().includes("10gb") || plan.name.toLowerCase().includes("20gb"));

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 ${
                isHighlighted
                  ? "border-2 border-teal-500 shadow-lg shadow-teal-500/10 ring-4 ring-teal-500/5 bg-gradient-to-b from-teal-50/15 to-white"
                  : isOnSale
                  ? "border-2 border-rose-300 shadow-md shadow-rose-500/5"
                  : isBestValue
                  ? "border-2 border-slate-800 shadow-md"
                  : "border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              {/* Badges */}
              {isHighlighted && (
                <div className="absolute -top-3 right-6 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-3xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <svg className="w-2.5 h-2.5 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{plan.badge_text || "Featured"}</span>
                </div>
              )}
              {!isHighlighted && isOnSale && (
                <div className="absolute -top-3 right-6 bg-gradient-to-r from-rose-600 to-orange-500 text-white text-3xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  {plan.badge_text || "Special Offer"}
                </div>
              )}
              {!isHighlighted && !isOnSale && isBestValue && (
                <div className="absolute -top-3 right-6 bg-slate-900 text-teal-300 text-3xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  {plan.badge_text || "Best Value"}
                </div>
              )}
              {!isHighlighted && !isOnSale && !isBestValue && plan.badge_text && (
                <div className="absolute -top-3 right-6 bg-indigo-600 text-white text-3xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  {plan.badge_text}
                </div>
              )}

              {/* Top Details */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                      {gb}G
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                      {plan.name}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 flex items-center gap-1">
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{plan.validity_days} Days</span>
                  </span>
                </div>

                {/* Price Display */}
                <div className="my-4 pb-4 border-b border-slate-100">
                  <div className="flex items-baseline gap-2">
                    {isOnSale ? (
                      <>
                        <span className="text-3xl sm:text-4xl font-black text-rose-600 tracking-tight">
                          ${effectivePrice.toFixed(2)}
                        </span>
                        <span className="text-sm font-semibold text-slate-400 line-through">
                          ${regularPrice.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                        ${regularPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-medium">USD</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/50">
                      ${pricePerGb} / GB
                    </span>
                    <span className="text-2xs text-slate-400">
                      {gb} GB high-speed allowance
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 leading-relaxed min-h-[36px] mb-5">
                  {plan.description || `${plan.name} international data plan valid for ${plan.validity_days} days across 140+ countries.`}
                </p>

                {/* Feature bullets */}
                <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
                  <li className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Tier-1 4G LTE & 5G Roaming</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Personal Hotspot & Tethering</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Instant Activation via Instagram DM</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons (View Details + Buy) */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors text-center"
                >
                  View Specs
                </button>

                <button
                  type="button"
                  onClick={() => setCheckoutPlan(plan)}
                  className={`flex-1 min-h-[44px] px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs text-center flex items-center justify-center gap-1.5 ${
                    isPopular
                      ? "bg-teal-600 hover:bg-teal-700 active:bg-teal-800"
                      : "bg-slate-900 hover:bg-teal-600 active:bg-teal-700"
                  }`}
                >
                  <span>BUY NOW</span>
                  <span className="text-teal-200">⚡</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── View Specs Modal ────────────────────────────────────── */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedPlan.name} Plan Specs
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full Technical & Roaming Specifications
                </p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Data Allowance:</span>
                <span className="font-bold text-slate-800">
                  {Number(selectedPlan.data_amount_gb)} GB High-Speed
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Price:</span>
                <span className="font-bold text-slate-800">
                  ${Number(selectedPlan.price).toFixed(2)} USD
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Validity:</span>
                <span className="font-bold text-slate-800">
                  {selectedPlan.validity_days} Days from first connection
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">APN Setting:</span>
                <span className="font-mono font-bold text-slate-800">
                  globaldata
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Coverage:</span>
                <span className="font-bold text-teal-700">140+ Countries</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              {selectedPlan.description}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = selectedPlan;
                  setSelectedPlan(null);
                  if (p) setCheckoutPlan(p);
                }}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>BUY NOW</span>
                <span className="text-teal-200">⚡</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ask AI Floating Widget (Bottom-Right Corner) ────────── */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isAiOpen ? (
          <button
            onClick={() => setIsAiOpen(true)}
            className="flex items-center gap-2.5 bg-slate-900 hover:bg-teal-700 text-white px-5 py-3 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 text-xs font-bold border border-slate-800"
          >
            <svg className="w-4 h-4 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span>Ask AI Assistant</span>
          </button>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-80 sm:w-96 flex flex-col h-[480px] overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
            {/* AI Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-sm font-bold">
                  <svg className="w-4 h-4 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">Simvaya AI Travel Guide</h4>
                  <p className="text-3xs text-slate-400">Ask which plan is right for your trip</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close assistant"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-50/50">
              {aiMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-2xs ${
                      msg.sender === "user"
                        ? "bg-teal-600 text-white rounded-br-xs font-medium"
                        : "bg-white text-slate-800 rounded-bl-xs border border-slate-200/80"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-xs px-4 py-3 border border-slate-200/80 text-slate-400 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Suggested Quick Question Chips */}
            <div className="p-2.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto text-3xs text-slate-600 no-scrollbar">
              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => handleAskAi("Which plan for a 10 day trip?")}
                className="whitespace-nowrap px-2.5 py-1 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 rounded-lg border border-slate-200 transition-colors font-medium disabled:opacity-50"
              >
                10-day trip?
              </button>
              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => handleAskAi("Does hotspot work?")}
                className="whitespace-nowrap px-2.5 py-1 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 rounded-lg border border-slate-200 transition-colors font-medium disabled:opacity-50"
              >
                Hotspot allowed?
              </button>
              <button
                type="button"
                disabled={isAiLoading}
                onClick={() => handleAskAi("Does it work in Dubai and Europe?")}
                className="whitespace-nowrap px-2.5 py-1 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 rounded-lg border border-slate-200 transition-colors font-medium disabled:opacity-50"
              >
                Dubai/Europe?
              </button>
            </div>

            {/* AI Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAi();
              }}
              className="p-3 bg-white border-t border-slate-200 flex gap-2"
            >
              <input
                type="text"
                value={aiInput}
                disabled={isAiLoading}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder={isAiLoading ? "AI is thinking..." : "Ask about destinations, trips, or data..."}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={isAiLoading || !aiInput.trim()}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {checkoutPlan && (
        <CheckoutModal
          plan={{
            id: checkoutPlan.id,
            name: checkoutPlan.name,
            price: checkoutPlan.price,
            sale_price: checkoutPlan.sale_price,
            is_on_sale: checkoutPlan.is_on_sale,
            data: `${checkoutPlan.data_amount_gb} GB`,
            validity: `${checkoutPlan.validity_days} Days`,
            instagram_message: checkoutPlan.instagram_message,
          }}
          isOpen={Boolean(checkoutPlan)}
          onClose={() => setCheckoutPlan(null)}
          isCustomerLoggedIn={true}
        />
      )}
    </div>
  );
}

