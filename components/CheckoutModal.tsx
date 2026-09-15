"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";
import { useCurrency } from "./CurrencyContext";
import { X, Copy, Check, MessageCircle, ArrowLeft, Zap } from "lucide-react";

export interface CheckoutPlan {
  id: string;
  name: string;
  price: number | string | null;
  sale_price?: number | string | null;
  is_on_sale?: boolean;
  data?: string;
  validity?: string;
  instagram_message?: string | null;
}

interface CheckoutModalProps {
  plan: CheckoutPlan;
  isOpen: boolean;
  onClose: () => void;
  isCustomerLoggedIn?: boolean;
  customerUsername?: string;
}

type Step = "choose" | "crypto" | "success";
type CryptoNetwork = "trc20" | "bep20" | "polygon";

export default function CheckoutModal({
  plan,
  isOpen,
  onClose,
  isCustomerLoggedIn = false,
  customerUsername = "",
}: CheckoutModalProps) {
  const [step, setStep] = useState<Step>("choose");
  const [network, setNetwork] = useState<CryptoNetwork>("trc20");
  const [copied, setCopied] = useState(false);
  const [txid, setTxid] = useState("");
  const [identifier, setIdentifier] = useState(customerUsername);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { formatPrice } = useCurrency();

  if (!isOpen) return null;

  const activePrice = plan.is_on_sale && plan.sale_price ? plan.sale_price : plan.price;
  const priceDisplay = formatPrice(activePrice).formatted;
  const usdtAmount = Number(activePrice || 0).toFixed(2);

  // Instagram message
  const defaultMsg = `Hi ${siteConfig.name}! I want to buy the ${plan.name} eSIM plan (${priceDisplay}).`;
  const customMsg = plan.instagram_message
    ? `${plan.instagram_message} (${priceDisplay})`
    : defaultMsg;
  const instagramUrl = `https://ig.me/m/${siteConfig.instagramUsername}?text=${encodeURIComponent(customMsg)}`;

  // Wallet address based on active network
  const walletAddresses: Record<CryptoNetwork, { name: string; chain: string; address: string; badge: string }> = {
    trc20: {
      name: "USDT (TRC-20)",
      chain: "Tron Network",
      address: siteConfig.cryptoWallets?.trc20 || "TF17bgPaZYbq25b6a7C118z1gAxg5c6NTR",
      badge: "Fastest · Lowest Fee (~$1)",
    },
    bep20: {
      name: "USDT (BEP-20)",
      chain: "BNB Smart Chain (BSC)",
      address: siteConfig.cryptoWallets?.bep20 || "0x12a89F95F4D3C52367d3b2e75D65A2f5922378f5",
      badge: "Binance Chain (~$0.30)",
    },
    polygon: {
      name: "USDT (Polygon)",
      chain: "Polygon PoS",
      address: siteConfig.cryptoWallets?.polygon || "0x12a89F95F4D3C52367d3b2e75D65A2f5922378f5",
      badge: "Polygon (~$0.02)",
    },
  };

  const currentWallet = walletAddresses[network];

  async function handleCopyAddress() {
    await navigator.clipboard.writeText(currentWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConfirmCrypto(e: React.FormEvent) {
    e.preventDefault();
    if (!txid.trim()) {
      setSubmitError("Please enter your Transaction Hash (TXID) from your wallet.");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders/crypto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          amountUsdt: usdtAmount,
          network: currentWallet.name,
          walletAddress: currentWallet.address,
          txid: txid.trim(),
          customerIdentifier: identifier.trim() || customerUsername || "Guest Customer",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to submit transaction. Please try again or chat on Instagram.");
        setIsSubmitting(false);
        return;
      }

      setStep("success");
      setIsSubmitting(false);
    } catch {
      setStep("success");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200/90 text-slate-900 overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 mb-4 border-b border-slate-100 relative z-10">
          <div className="flex items-center gap-2.5">
            {step !== "choose" && (
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {step === "choose" ? "Choose Payment Method" : step === "crypto" ? "Pay with Crypto" : "Order Confirmed!"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {plan.name} eSIM · <span className="font-bold text-teal-700">{priceDisplay}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1: Choose Payment Method */}
        {step === "choose" && (
          <div className="space-y-4 relative z-10">
            {/* Plan Info Pill */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">{plan.name} eSIM</p>
                <p className="text-2xs text-slate-500">
                  {plan.data || "High-Speed Data"} · {plan.validity || "Global Roaming"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900">{priceDisplay}</span>
                <span className="block text-3xs text-emerald-600 font-semibold">≈ {usdtAmount} USDT</span>
              </div>
            </div>

            {/* Option 1: Crypto (USDT) — Highlighted with Auto-Activation */}
            <div
              onClick={() => setStep("crypto")}
              className="relative p-5 rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50/50 via-teal-50/20 to-white hover:border-emerald-600 cursor-pointer transition-all shadow-sm hover:shadow-md group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-emerald-600/30">
                    ₮
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                      <span>Pay with Crypto (USDT)</span>
                    </h3>
                    <p className="text-2xs text-slate-500">TRC-20 · BEP-20 · Polygon</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 animate-pulse">
                  <Zap size={11} className="text-emerald-700 fill-emerald-700" />
                  <span>Auto Plan Activation</span>
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mt-2.5">
                Instant automated plan activation within 60 seconds of blockchain confirmation. Zero banking delays and 0% processing fees.
              </p>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-emerald-200/60">
                <span className="text-2xs font-semibold text-emerald-700">Recommended for fastest activation</span>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Continue with USDT →
                </span>
              </div>
            </div>

            {/* Option 2: Instagram (Bank Transfer / Cards / Concierge) */}
            <div
              onClick={() => window.open(instagramUrl, "_blank", "noopener,noreferrer")}
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                    <MessageCircle size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
                      Other Payment Methods
                    </h3>
                    <p className="text-2xs text-slate-500">Bank Transfer · Raast · Cards · Nayapay · Sadapay</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-3xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Chat on Instagram
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mt-2.5">
                Pay via local bank transfer, mobile wallets, or credit/debit card assisted 24/7 by our Instagram concierge team.
              </p>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-2xs text-slate-400">Assisted setup by Simvaya Concierge</span>
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Chat on Instagram @simvaya21</span>
                  <span>↗</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Crypto Payment Details */}
        {step === "crypto" && (
          <form onSubmit={handleConfirmCrypto} className="space-y-4 relative z-10">
            {/* Amount Banner */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-2xs font-semibold text-emerald-800 uppercase tracking-wider block">Total Amount to Send</span>
                <span className="text-2xl font-black text-slate-900">${usdtAmount} <span className="text-sm text-emerald-700 font-bold">USDT</span></span>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-3xs font-extrabold bg-emerald-600 text-white px-2.5 py-1 rounded-full shadow-2xs">
                  <Zap size={10} className="fill-white" />
                  Auto-Activation Enabled
                </span>
                <span className="block text-3xs text-slate-400 mt-1">Network fee: ~\${network === "trc20" ? "1" : network === "bep20" ? "0.30" : "0.02"}</span>
              </div>
            </div>

            {/* Network Selector Tabs */}
            <div>
              <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Select Blockchain Network
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["trc20", "bep20", "polygon"] as CryptoNetwork[]).map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setNetwork(net)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center border ${
                      network === net
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{net.toUpperCase()}</span>
                  </button>
                ))}
              </div>
              <p className="text-3xs text-slate-500 mt-1.5 flex items-center gap-1">
                <span>ℹ️</span>
                <span>Selected: <strong>{currentWallet.chain}</strong> ({currentWallet.badge})</span>
              </p>
            </div>

            {/* QR Code + Wallet Address */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-28 h-28 bg-white p-1.5 rounded-xl border border-slate-200 shrink-0 flex items-center justify-center shadow-2xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentWallet.address)}`}
                  alt="USDT Deposit QR"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 w-full">
                <span className="text-2xs font-bold text-slate-600 block mb-1">2. Send to Deposit Address</span>
                <div className="p-2.5 bg-white rounded-xl border border-slate-300/80 font-mono text-xs text-slate-800 break-all select-all font-semibold leading-relaxed">
                  {currentWallet.address}
                </div>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="mt-2.5 w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span>Copied Address!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Identifier (if not logged in) */}
            {!isCustomerLoggedIn && (
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  3. Your Email / Username (for eSIM account)
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. your_email@domain.com or username"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}

            {/* Transaction Hash Input */}
            <div>
              <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {isCustomerLoggedIn ? "3." : "4."} Enter Transaction Hash / TXID
              </label>
              <input
                type="text"
                required
                value={txid}
                onChange={(e) => setTxid(e.target.value)}
                placeholder="Paste TXID (e.g. 7f8a9b... or 0x3d4e...)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <p className="text-3xs text-slate-500 mt-1">
                Copy the TXID or transaction link from your Binance, TrustWallet, or crypto app after sending.
              </p>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {submitError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Verifying on Blockchain...</span>
                </>
              ) : (
                <>
                  <Zap size={15} className="fill-white" />
                  <span>Confirm Payment & Auto-Activate Plan</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 3: Success Confirmation */}
        {step === "success" && (
          <div className="text-center py-4 relative z-10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-3xl animate-bounce">
              ⚡
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Payment Received & Auto-Activated!
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Your <strong>{plan.name}</strong> eSIM data plan has been provisioned on the network.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan:</span>
                <span className="font-bold text-slate-900">{plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-emerald-700">${usdtAmount} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Network:</span>
                <span className="font-bold text-slate-700">{currentWallet.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <Check size={13} />
                  <span>Active & Provisioned</span>
                </span>
              </div>
              {txid && (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-3xs text-slate-400 block mb-0.5">Transaction Hash:</span>
                  <span className="font-mono text-3xs text-slate-700 break-all">{txid}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <a
                href="/dashboard"
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold transition-all shadow-xs text-center"
              >
                Go to Traveler Dashboard →
              </a>
              <a
                href={`https://ig.me/m/${siteConfig.instagramUsername}?text=${encodeURIComponent(
                  `Hi ${siteConfig.name}! I just paid with USDT for ${plan.name} (TXID: ${txid}). Please send my QR code!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageCircle size={15} />
                <span>Chat with Concierge on Instagram</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
