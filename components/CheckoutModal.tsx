"use client";

import { useState, useEffect, useRef } from "react";
import QRCodeSVG from "./QRCodeSVG";
import { X, Copy, Check, Zap, CheckCircle2, ShieldCheck, RefreshCw, Lock } from "lucide-react";
import Link from "next/link";

export interface CheckoutPlan {
  id: string;
  name: string;
  price: number | string | null;
  sale_price?: number | string | null;
  is_on_sale?: boolean;
  data?: string;
  validity?: string;
}

interface CheckoutModalProps {
  plan: CheckoutPlan;
  isOpen: boolean;
  onClose: () => void;
  customerUsername?: string;
}

interface CryptoSession {
  sessionId: string;
  depositAddress: string;
  planName: string;
  planPrice: number;
  gasFee: number;
  totalUsdt: number;
  expiresAt: string;
}

export default function CheckoutModal({
  plan,
  isOpen,
  onClose,
  customerUsername = "",
}: CheckoutModalProps) {
  const [session, setSession] = useState<CryptoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAuthError, setIsAuthError] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [hasEsim, setHasEsim] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session on modal open
  useEffect(() => {
    if (!isOpen) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setSession(null);
      setIsConfirmed(false);
      setError("");
      setIsAuthError(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError("");
    setIsAuthError(false);

    fetch("/api/crypto/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!isMounted) return;
        if (res.status === 401 || (data.error && data.error.toLowerCase().includes("auth"))) {
          setIsAuthError(true);
          setError(data.error || "Please sign in to your account to activate your eSIM.");
          setLoading(false);
          return;
        }
        if (data.success) {
          setSession(data);
          setLoading(false);
        } else {
          setError(data.error || "Failed to initialize checkout.");
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Network error initializing payment session.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, plan.id]);

  // Real-time on-chain balance listener (polls every 3 seconds)
  useEffect(() => {
    if (!session || isConfirmed) return;

    const checkBalance = async () => {
      try {
        setIsPolling(true);
        const res = await fetch(`/api/crypto/check-session?sessionId=${session.sessionId}`);
        const data = await res.json();

        if (data.status === "confirmed") {
          setIsConfirmed(true);
          setHasEsim(Boolean(data.hasEsim));
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch (err) {
        console.error("Balance poll error:", err);
      } finally {
        setTimeout(() => setIsPolling(false), 800);
      }
    };

    // Initial check and interval setup
    checkBalance();
    pollIntervalRef.current = setInterval(checkBalance, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [session, isConfirmed]);

  if (!isOpen) return null;

  async function handleCopyAmount() {
    if (!session) return;
    await navigator.clipboard.writeText(session.totalUsdt.toFixed(2));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  }

  async function handleCopyAddress() {
    if (!session) return;
    await navigator.clipboard.writeText(session.depositAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* LOADING STATE */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full border-3 border-teal-600 border-t-transparent animate-spin mb-4" />
            <p className="font-bold text-slate-900 text-sm">Generating Unique Deposit Wallet...</p>
            <p className="text-xs text-slate-400 mt-1">Connecting directly to BNB Smart Chain (BEP-20)</p>
          </div>
        )}

        {/* AUTH REQUIRED STATE */}
        {!loading && error && isAuthError && (
          <div className="py-8 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-teal-400 flex items-center justify-center mx-auto mb-3 shadow-md shadow-slate-900/10">
              <Lock size={22} className="text-teal-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Account Required
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 tracking-tight">
              Sign In to Activate Your eSIM
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 px-4 leading-relaxed max-w-sm mx-auto">
              Please sign in so your eSIM QR code can be automatically provisioned and securely linked to your account.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center px-4">
              <Link
                href={`/login?redirect=/plans&planId=${plan.id}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold transition shadow-xs shadow-teal-600/20"
              >
                <Zap size={14} className="fill-white" />
                <span>Sign In to Continue</span>
              </Link>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* GENERIC ERROR STATE */}
        {!loading && error && !isAuthError && (
          <div className="py-8 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <X size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Checkout Notice</h3>
            <p className="text-xs text-slate-600 mt-1 mb-5">{error}</p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        )}

        {/* SUCCESS CONFIRMED STATE */}
        {!loading && !error && isConfirmed && (
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Payment Detected On-Chain
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">
                Payment Confirmed! ⚡
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 px-4">
                {hasEsim
                  ? "Your transaction has been verified on BNB Smart Chain. Your eSIM profile & QR code are ready on your dashboard!"
                  : "Your transaction has been verified on BNB Smart Chain. Your eSIM profile will be added shortly by our team."}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Plan:</span>
                <span className="font-bold text-slate-800">{plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Paid:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {session?.totalUsdt.toFixed(2)} USDT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-emerald-700">Auto-Activated</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard"
                onClick={onClose}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition"
              >
                <span>Go to My Dashboard</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* ACTIVE CHECKOUT SCREEN */}
        {!loading && !error && !isConfirmed && session && (
          <div className="space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  BEP-20 USDT (BSC)
                </span>
                <span className="text-2xs text-slate-400">Order #{session.sessionId.slice(0, 6)}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {session.planName} eSIM
              </h3>
            </div>

            {/* Price & Gas Breakdown */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/90 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Plan Price:</span>
                <span className="font-semibold text-slate-800">${session.planPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1">
                  <span>BSC Network Gas:</span>
                  <span className="text-3xs bg-slate-200 text-slate-700 font-bold px-1 rounded">Network Fee</span>
                </span>
                <span className="font-semibold text-slate-800">+${session.gasFee.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-2xs uppercase tracking-wider font-bold text-slate-400 block">
                    Exact Amount to Send
                  </span>
                  <span className="text-xl font-black text-slate-900 tracking-tight">
                    {session.totalUsdt.toFixed(2)}{" "}
                    <span className="text-xs font-bold text-teal-600">USDT</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAmount}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition active:scale-95"
                >
                  {copiedAmount ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedAmount ? "Copied!" : "Copy Amount"}</span>
                </button>
              </div>
            </div>

            {/* QR Code & Deposit Address */}
            <div className="flex flex-col items-center bg-white p-3 rounded-2xl border border-slate-200 text-center">
              <p className="text-2xs font-semibold text-slate-500 mb-2">
                Scan with Binance, Trust Wallet, MetaMask, or any wallet
              </p>
              
              <div className="p-1 bg-white rounded-xl shadow-xs">
                <QRCodeSVG value={session.depositAddress} size={155} />
              </div>

              {/* Address Box */}
              <div className="w-full mt-3">
                <div className="flex items-center justify-between gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="font-mono text-xs text-slate-800 break-all select-all font-semibold px-1 text-left">
                    {session.depositAddress}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition shrink-0"
                    title="Copy Address"
                  >
                    {copiedAddress ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-3xs text-slate-400 mt-1">
                  Send BEP-20 USDT only. ±$0.05 difference or higher is accepted.
                </p>
              </div>
            </div>

            {/* Real-time Blockchain Pulse Detector */}
            <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center w-6 h-6">
                  <span className="absolute w-full h-full rounded-full bg-teal-400/40 animate-ping" />
                  <span className="relative w-3 h-3 rounded-full bg-teal-600" />
                </div>
                <div>
                  <p className="font-bold text-teal-950 text-xs">
                    Listening on BNB Smart Chain...
                  </p>
                  <p className="text-slate-500 text-2xs">
                    Auto-detects transfer · No TXID entry required
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <RefreshCw
                  size={14}
                  className={`text-teal-600 ${isPolling ? "animate-spin" : ""}`}
                />
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-3xs text-slate-400">
              Address expires in 45 minutes · Direct on-chain confirmation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
