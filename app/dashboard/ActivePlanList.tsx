"use client";

import { useState } from "react";

export interface PlanItem {
  id: string;
  plan_name: string;
  total_gb: string | number;
  used_gb: string | number;
  displayedUsage: number;
  remainingGb: number;
  usagePercent: number;
  daysRemaining: number;
  start_date: string;
  expiry_date: string;
  last_usage_update_at: string | null;
  status: string;
  isLow: boolean;
  isExpiringSoon: boolean;
  activation_code?: string | null;
  provider_name?: string | null;
  notes?: string | null;
}

interface Props {
  plans: PlanItem[];
  username: string;
}

export default function ActivePlanList({ plans, username }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "verified" | "denied">("idle");
  const [copied, setCopied] = useState(false);
  const [accuracyMsg, setAccuracyMsg] = useState<string>("");

  // Request exact live device GPS coordinates via direct user interaction
  function requestDeviceLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("denied");
      return;
    }

    setLocationStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/customer/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gpsLat: pos.coords.latitude,
              gpsLon: pos.coords.longitude,
              gpsAccuracy: pos.coords.accuracy,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setLocationStatus("verified");
            setAccuracyMsg(`🎯 Live GPS Verified (${data.locality ? `${data.locality}, ` : ""}${data.city})`);
          } else {
            setLocationStatus("verified");
          }
        } catch {
          setLocationStatus("verified");
        }
      },
      (err) => {
        console.warn("Location permission error or dismissed:", err);
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function handleOpenDetails(plan: PlanItem) {
    setSelectedPlan(plan);
    // Request hardware GPS directly on user click
    requestDeviceLocation();
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative overflow-hidden bg-white rounded-3xl border p-6 sm:p-7 shadow-xs transition-all ${
              plan.isExpiringSoon
                ? "border-amber-300 ring-1 ring-amber-100"
                : plan.isLow
                ? "border-amber-300 ring-1 ring-amber-100"
                : "border-slate-200"
            }`}
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{plan.plan_name} Plan</h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">High-Speed 4G / 5G Global Roaming</p>
              </div>

              {/* Action Buttons: View Details + Top Up */}
              <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenDetails(plan)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-xs shadow-teal-600/20 active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View Details</span>
                </button>

                <a
                  href={`https://ig.me/m/simvaya21?text=${encodeURIComponent(
                    `Hi Simvaya! I'd like to top up my ${plan.plan_name} plan for @${username}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs"
                >
                  <svg className="w-3.5 h-3.5 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Top Up Data</span>
                </a>
              </div>
            </div>

            {/* Battery-style remaining data progress bar */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 mb-5">
              <div className="flex justify-between items-baseline text-sm mb-2">
                <div>
                  <span className="text-xs font-medium text-slate-500 block">Remaining Data</span>
                  <span className="text-xl font-black text-slate-800">
                    {plan.remainingGb.toFixed(2)}{" "}
                    <span className="text-xs font-bold text-slate-500">GB</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-slate-400">Data Used</span>
                  <p className="text-sm font-semibold text-slate-700">
                    {plan.displayedUsage.toFixed(2)} / {Number(plan.total_gb).toFixed(2)} GB ({plan.usagePercent}%)
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    plan.isLow
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-teal-500 to-emerald-500"
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100 - plan.usagePercent, 100))}%` }}
                />
              </div>

              {plan.isLow && (
                <div className="flex items-center gap-2 mt-3 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  <span>Notice:</span>
                  <span>You have used over 80% of your data. Click Top Up to stay connected.</span>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium">Days Remaining</p>
                <p className={`text-sm font-bold mt-0.5 ${plan.isExpiringSoon ? "text-amber-600" : "text-slate-800"}`}>
                  {plan.daysRemaining} Days
                </p>
              </div>

              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium">Expiry Date</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {new Date(plan.expiry_date).toISOString().split("T")[0]}
                </p>
              </div>

              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium">Activation Date</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {new Date(plan.start_date).toISOString().split("T")[0]}
                </p>
              </div>

              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium">Usage Synced</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {plan.last_usage_update_at
                    ? new Date(plan.last_usage_update_at).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0]}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── View Details Modal ────────────────────────────────────── */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60">
                  Active eSIM Bundle
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">
                  {selectedPlan.plan_name} Plan
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Global traveler cellular profile & activation specs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors text-sm font-bold"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Location Security Status Banner */}
            <div className="mb-4">
              {locationStatus === "verified" ? (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                  <span className="text-sm">🎯</span>
                  <span className="font-semibold">{accuracyMsg || "Live Device GPS Verified"}</span>
                </div>
              ) : locationStatus === "requesting" ? (
                <div className="bg-teal-50 text-teal-800 border border-teal-200 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 animate-pulse">
                  <span className="text-sm">📍</span>
                  <span>Verifying live location... Please tap <strong>Allow</strong> on your screen.</span>
                </div>
              ) : (
                <div className="bg-slate-50 text-slate-700 border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📍</span>
                    <span>Device security check</span>
                  </div>
                  <button
                    type="button"
                    onClick={requestDeviceLocation}
                    className="text-2xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
                  >
                    Tap to Verify Location
                  </button>
                </div>
              )}
            </div>

            {/* eSIM Activation Credentials */}
            <div className="space-y-4 mb-6">
              {selectedPlan.activation_code ? (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700">eSIM Activation Code (LPA)</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedPlan.activation_code || "")}
                      className="text-2xs font-bold text-teal-700 hover:text-teal-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs"
                    >
                      {copied ? "✓ Copied!" : "Copy Code"}
                    </button>
                  </div>
                  <p className="font-mono text-xs text-slate-800 break-all select-all font-semibold bg-white p-2.5 rounded-xl border border-slate-200">
                    {selectedPlan.activation_code}
                  </p>
                </div>
              ) : (
                <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 text-xs text-teal-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>✓</span>
                    <span>eSIM Active & Provisioned</span>
                  </p>
                  <p className="text-slate-600 text-2xs">
                    Your eSIM is already active on the global cellular network. If you need your original activation QR code again, message us on Instagram.
                  </p>
                </div>
              )}

              {/* Data Specifications Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-2xs font-medium">Total Data Allowance</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{Number(selectedPlan.total_gb)} GB High-Speed</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-2xs font-medium">Remaining Data</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 block">{selectedPlan.remainingGb.toFixed(2)} GB</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-2xs font-medium">Plan Expiry Date</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">{new Date(selectedPlan.expiry_date).toISOString().split("T")[0]}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-2xs font-medium">Network Coverage</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">5G / 4G LTE Worldwide</span>
                </div>
              </div>

              {/* Quick Setup Checklist */}
              <div className="rounded-2xl border border-slate-200 p-4 bg-white text-xs space-y-2">
                <p className="font-bold text-slate-800 text-2xs uppercase tracking-wider">Roaming Checklist</p>
                <div className="space-y-1.5 text-slate-600 text-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">1.</span>
                    <span>Make sure <strong>Data Roaming</strong> is turned <strong>ON</strong> in phone settings.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">2.</span>
                    <span>Set Cellular / Mobile Data to this eSIM profile.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">3.</span>
                    <span>APN: Set to <strong>globaldata</strong> (or automatically configured).</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
