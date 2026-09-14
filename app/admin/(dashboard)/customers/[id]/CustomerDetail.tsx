"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calculateCurrentUsage } from "@/lib/usage";

interface Plan {
  id: string;
  plan_name: string;
  total_gb: string | number;
  used_gb: string | number;
  manual_used_gb?: string | number | null;
  manual_updated_at?: string | null;
  daily_burn_rate?: string | number | null;
  start_date: string;
  expiry_date: string;
  status: string;
  last_usage_update_at: string | null;
  created_at?: string | null;
  esim_id: string | null;
}

interface Esim {
  id: string;
  provider_name: string;
  provider_email: string;
  provider_password: string;
  activation_code: string | null;
  notes: string | null;
}

interface CatalogPlan {
  id: string;
  name: string;
  data_amount_gb: string;
  price: string;
  validity_days: number;
}

interface Props {
  customer: {
    id: string;
    username: string;
    display_name: string;
    last_login_at: string | null;
    created_at: string;
  };
  plans: Plan[];
  esims: Esim[];
  planCatalog: CatalogPlan[];
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

export default function CustomerDetail({ customer, plans, esims, planCatalog }: Props) {
  const router = useRouter();

  // Password reset state
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Usage update state
  const [usageValues, setUsageValues] = useState<Record<string, string>>({});
  const [usageLoading, setUsageLoading] = useState<string | null>(null);
  const [usageSuccess, setUsageSuccess] = useState<string | null>(null);

  // Delete plan state
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [deletePlanLoading, setDeletePlanLoading] = useState(false);

  // Add plan state
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [addPlanId, setAddPlanId] = useState("");
  const [addStartDate, setAddStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [addLoading, setAddLoading] = useState(false);

  // Show/hide eSIM credentials
  const [visibleEsims, setVisibleEsims] = useState<Set<string>>(new Set());

  // General
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const activePlans = plans.filter((p) => p.status === "active");
  const expiredPlans = plans.filter((p) => p.status === "expired");

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  // ── Reset Password ───────────────────────────────────
  async function handleResetPassword() {
    const pw = generatePassword();
    setNewPassword(pw);
    setResetLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setResetLoading(false);
        return;
      }
      setResetDone(true);
      setResetLoading(false);
    } catch {
      setError("Failed to reset password.");
      setResetLoading(false);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Update Usage ─────────────────────────────────────
  async function handleUpdateUsage(planId: string) {
    const value = usageValues[planId];
    if (value === undefined || value === "") return;

    setUsageLoading(planId);
    setError("");

    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/update-usage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, used_gb: Number(value) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setUsageLoading(null);
        return;
      }
      setUsageLoading(null);
      setUsageSuccess(planId);
      setTimeout(() => setUsageSuccess(null), 2500);
      showSuccess("Usage baseline updated successfully!");
      router.refresh();
    } catch {
      setError("Failed to update usage.");
      setUsageLoading(null);
    }
  }

  // ── Delete Customer Plan ─────────────────────────────
  async function handleDeletePlan(planId: string) {
    setDeletePlanLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/delete-plan?plan_id=${planId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setDeletePlanLoading(false);
        setDeletePlanId(null);
        return;
      }
      setDeletePlanLoading(false);
      setDeletePlanId(null);
      showSuccess("Plan removed successfully!");
      router.refresh();
    } catch {
      setError("Failed to delete plan.");
      setDeletePlanLoading(false);
      setDeletePlanId(null);
    }
  }

  // ── Add Plan ─────────────────────────────────────────
  async function handleAddPlan() {
    if (!addPlanId || !addStartDate) return;
    setAddLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/add-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_catalog_id: addPlanId, start_date: addStartDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setAddLoading(false);
        return;
      }
      setShowAddPlan(false);
      setAddPlanId("");
      setAddLoading(false);
      showSuccess("Plan added successfully!");
      router.refresh();
    } catch {
      setError("Failed to add plan.");
      setAddLoading(false);
    }
  }

  // ── Toggle eSIM visibility ───────────────────────────
  function toggleEsim(esimId: string) {
    setVisibleEsims((prev) => {
      const next = new Set(prev);
      if (next.has(esimId)) next.delete(esimId);
      else next.add(esimId);
      return next;
    });
  }

  // Expiry preview for add plan
  const selectedCatalog = planCatalog.find((p) => p.id === addPlanId);
  let addExpiryPreview = "";
  if (selectedCatalog && addStartDate) {
    const exp = new Date(addStartDate);
    exp.setDate(exp.getDate() + selectedCatalog.validity_days);
    addExpiryPreview = exp.toLocaleDateString();
  }

  const initials = customer.display_name
    ? customer.display_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : customer.username.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast Feedback */}
      {successMsg && (
        <div className="bg-teal-50 text-teal-800 text-xs sm:text-sm px-4 py-3 rounded-xl border border-teal-200 font-semibold flex items-center gap-2 shadow-2xs">
          <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-700 text-xs sm:text-sm px-4 py-3 rounded-xl border border-rose-200 font-semibold flex items-center gap-2 shadow-2xs">
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* ── Breadcrumb & Profile Header ──────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Customer Directory</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-teal-300 text-lg font-bold flex items-center justify-center shadow-xs shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {customer.display_name}
                </h1>
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  @{customer.username}
                </span>
              </div>
              <p className="text-2xs text-slate-400 mt-1 font-mono">
                Subscriber ID: {customer.id}
              </p>
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 text-xs text-slate-500 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
            <div>
              <span className="text-slate-400">Registered: </span>
              <span className="font-medium text-slate-700">{String(customer.created_at).split("T")[0]}</span>
            </div>
            <div>
              <span className="text-slate-400">Last Session: </span>
              <span className="font-medium text-slate-700">
                {customer.last_login_at ? String(customer.last_login_at).split("T")[0] : "Never"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Password / Security Card ─────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Account Credentials</h2>
              <p className="text-2xs text-slate-400">Customer login access & authentication</p>
            </div>
          </div>

          {!showResetPassword && !resetDone && (
            <button
              onClick={() => setShowResetPassword(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200/80 rounded-xl hover:bg-teal-100 transition-colors shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset Password</span>
            </button>
          )}
        </div>

        {showResetPassword && !resetDone && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-600 mb-3">
              Generate a new cryptographically random password for <strong className="text-slate-800 font-mono">@{customer.username}</strong>. Their previous password will immediately stop working.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-xl
                           hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {resetLoading ? "Generating..." : "Confirm & Generate New Password"}
              </button>
              <button
                onClick={() => setShowResetPassword(false)}
                className="px-4 py-2 bg-white text-slate-700 text-xs font-semibold rounded-xl
                           border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {resetDone && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>New Temporary Password (Shown Once Only)</span>
                </div>
                <button
                  onClick={() => handleCopy(newPassword)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 bg-white border border-amber-200 px-2.5 py-1 rounded-lg shadow-2xs transition-colors"
                >
                  {copied ? "✓ Copied!" : "Copy Password"}
                </button>
              </div>
              <p className="font-mono text-sm font-bold text-slate-800 break-all select-all">
                {newPassword}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Active Plans ──────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Active Plans
            </h2>
            <span className="text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
              {activePlans.length}
            </span>
          </div>

          <button
            onClick={() => setShowAddPlan(!showAddPlan)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{showAddPlan ? "Cancel Provisioning" : "Add Plan"}</span>
          </button>
        </div>

        {/* Add Plan Form */}
        {showAddPlan && (
          <div className="bg-white rounded-2xl border border-teal-300/80 p-5 sm:p-6 shadow-sm animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Provision Additional Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Catalog Plan</label>
                <select
                  value={addPlanId}
                  onChange={(e) => setAddPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                             focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                >
                  <option value="">Choose a package...</option>
                  {planCatalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.data_amount_gb} GB — {p.validity_days} days
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Commencement Date</label>
                <input
                  type="date"
                  value={addStartDate}
                  onChange={(e) => setAddStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                             focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                />
              </div>
            </div>
            {addExpiryPreview && (
              <p className="text-xs text-slate-500 mt-2">
                Will expire on: <span className="font-bold text-teal-700 font-mono">{addExpiryPreview}</span>
              </p>
            )}
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={handleAddPlan}
                disabled={addLoading || !addPlanId}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl
                           hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
              >
                {addLoading ? "Adding Plan..." : "Provision Plan"}
              </button>
              <button
                onClick={() => setShowAddPlan(false)}
                className="px-4 py-2 bg-white text-slate-700 text-xs font-semibold rounded-xl
                           border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Plan Cards */}
        {activePlans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-2xs">
            <p className="text-xs font-medium text-slate-400">No active plans assigned to this customer.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activePlans.map((plan) => {
              const usage = calculateCurrentUsage(plan);
              const usagePercent = usage.percentUsed;
              const isHigh = usagePercent >= 80;
              const currentValue = usageValues[plan.id] ?? String(plan.manual_used_gb ?? plan.used_gb ?? "0");

              return (
                <div key={plan.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{plan.plan_name} Bundle</h3>
                        <p className="text-2xs text-slate-400 font-mono">Plan ID: {plan.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-2xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                      Active
                    </span>
                  </div>

                  {/* Progress Bar & Real-time Usage */}
                  <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <div>
                        <span className="font-bold text-slate-900">
                          {usage.currentUsedGb.toFixed(2)} GB
                        </span>
                        <span className="text-slate-500 font-medium"> used of {Number(plan.total_gb)} GB</span>
                        <span className="text-slate-400 ml-2">({usage.remainingGb.toFixed(2)} GB remaining)</span>
                      </div>
                      <span className={`font-bold ${isHigh ? "text-rose-600" : "text-slate-800"}`}>
                        {usagePercent}% utilized
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all ${isHigh ? "bg-rose-500" : "bg-teal-500"}`}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
                    </div>

                    {/* Calibration pace and anchor metadata */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-2xs text-slate-500">
                      <div>
                        <span className="text-slate-400">Admin Anchor: </span>
                        <span className="font-semibold text-slate-700 font-mono">{usage.manualGb.toFixed(2)} GB</span>
                        {plan.manual_updated_at && (
                          <span className="text-slate-400"> (set {new Date(plan.manual_updated_at).toLocaleDateString()})</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400">Auto-Rate: </span>
                        <span className="font-semibold text-teal-700 font-mono">~{usage.dailyRate.toFixed(2)} GB/day</span>
                        {usage.additionalGb > 0 && (
                          <span className="text-slate-400"> (+{usage.additionalGb.toFixed(2)} GB auto-accumulated)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dates Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
                    <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-2xs uppercase tracking-wider text-slate-400 font-semibold">Commenced</p>
                      <p className="text-slate-800 font-bold mt-0.5">{new Date(plan.start_date).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-2xs uppercase tracking-wider text-slate-400 font-semibold">Expires</p>
                      <p className="text-slate-800 font-bold mt-0.5">{new Date(plan.expiry_date).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 col-span-2 sm:col-span-1">
                      <p className="text-2xs uppercase tracking-wider text-slate-400 font-semibold">Last Data Synced</p>
                      <p className="text-slate-800 font-bold mt-0.5">
                        {plan.last_usage_update_at ? new Date(plan.last_usage_update_at).toLocaleDateString() : "Never"}
                      </p>
                    </div>
                  </div>

                  {/* Inline Update Usage and Delete Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                        Update Usage:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={Number(plan.total_gb)}
                          value={currentValue}
                          onChange={(e) =>
                            setUsageValues((prev) => ({ ...prev, [plan.id]: e.target.value }))
                          }
                          className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 font-mono
                                     focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                        <span className="text-xs text-slate-500 font-medium">GB</span>
                      </div>
                      <button
                        onClick={() => handleUpdateUsage(plan.id)}
                        disabled={usageLoading === plan.id}
                        className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg
                                   hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
                      >
                        {usageLoading === plan.id ? "Saving..." : "Save Usage"}
                      </button>
                      {usageSuccess === plan.id && (
                        <span className="text-xs text-teal-600 font-semibold flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Saved
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setDeletePlanId(plan.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete Plan</span>
                    </button>
                  </div>

                  {/* Confirmation for deleting plan */}
                  {deletePlanId === plan.id && (
                    <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                      <div>
                        <p className="text-xs font-bold text-rose-900">Remove this plan from customer?</p>
                        <p className="text-2xs text-rose-700">This will permanently delete this plan record and its usage history.</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          disabled={deletePlanLoading}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          {deletePlanLoading ? "Deleting..." : "Yes, Delete"}
                        </button>
                        <button
                          onClick={() => setDeletePlanId(null)}
                          disabled={deletePlanLoading}
                          className="px-3 py-1.5 bg-white text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Linked eSIMs ──────────────────────────────── */}
      {esims.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">Linked eSIM Inventory</h2>
          <div className="space-y-3">
            {esims.map((esim) => (
              <div key={esim.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{esim.provider_name}</h3>
                      <p className="text-2xs text-slate-400 font-mono">eSIM ID: {esim.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleEsim(esim.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {visibleEsims.has(esim.id) ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                    <span>{visibleEsims.has(esim.id) ? "Hide Carrier Info" : "Show Carrier Info"}</span>
                  </button>
                </div>

                {visibleEsims.has(esim.id) && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs bg-slate-50/70 rounded-xl p-4 border border-slate-100">
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-500 font-medium">Provider Account Email</span>
                      <span className="text-slate-800 font-mono font-semibold">{esim.provider_email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-500 font-medium">Provider Password</span>
                      <span className="text-slate-800 font-mono font-semibold">{esim.provider_password}</span>
                    </div>
                    {esim.activation_code && (
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500 font-medium">Activation Code (LPA)</span>
                        <span className="text-slate-800 font-mono font-semibold select-all">{esim.activation_code}</span>
                      </div>
                    )}
                    {esim.notes && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500 font-medium">Internal Notes</span>
                        <span className="text-slate-800 font-medium">{esim.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Expired Plans History ─────────────────────── */}
      {expiredPlans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">Expired Plans History</h2>
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left">
                  <th className="px-4 py-3 font-bold text-slate-500">Plan Bundle</th>
                  <th className="px-4 py-3 font-bold text-slate-500">Active Duration</th>
                  <th className="px-4 py-3 font-bold text-slate-500">Final Usage</th>
                  <th className="px-4 py-3 font-bold text-slate-500">Status</th>
                  <th className="px-4 py-3 font-bold text-slate-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{plan.plan_name}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(plan.start_date).toLocaleDateString()} – {new Date(plan.expiry_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {Number(plan.used_gb).toFixed(2)} / {Number(plan.total_gb)} GB
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-semibold text-2xs">
                        Expired
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        disabled={deletePlanLoading}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}