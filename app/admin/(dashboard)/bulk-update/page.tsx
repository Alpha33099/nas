"use client";

import { useState, useEffect } from "react";

interface ActivePlan {
  id: string;
  total_gb: string | number;
  used_gb: string | number;
  manual_used_gb?: string | number | null;
  live_used_gb?: number;
  percent_used?: number;
  daily_rate?: number;
  expiry_date: string;
  last_usage_update_at: string | null;
  plan_name: string;
  customer_username: string;
  customer_display_name: string;
}

export default function BulkUpdatePage() {
  const [plans, setPlans] = useState<ActivePlan[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch active plans on load
  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/admin/bulk-update");
        const data = await res.json();
        if (data.success) {
          setPlans(data.plans);
          // Initialize edited values with manual baseline
          const initial: Record<string, string> = {};
          data.plans.forEach((p: ActivePlan) => {
            initial[p.id] = String(p.manual_used_gb ?? p.used_gb);
          });
          setEditedValues(initial);
        }
      } catch {
        setError("Failed to load plans.");
      }
      setLoading(false);
    }
    fetchPlans();
  }, []);

  // Find which values actually changed
  function getChangedPlans() {
    return plans.filter((p) => {
      const original = String(p.manual_used_gb ?? p.used_gb);
      const edited = editedValues[p.id];
      return edited !== undefined && edited !== original;
    });
  }

  const changedPlans = getChangedPlans();

  async function handleSaveAll() {
    if (changedPlans.length === 0) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");

    const updates = changedPlans.map((p) => ({
      plan_id: p.id,
      used_gb: Number(editedValues[p.id]),
    }));

    try {
      const res = await fetch("/api/admin/bulk-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save.");
        setSaving(false);
        return;
      }

      // Refresh data
      const refreshRes = await fetch("/api/admin/bulk-update");
      const refreshData = await refreshRes.json();
      if (refreshData.success) {
        setPlans(refreshData.plans);
        const newValues: Record<string, string> = {};
        refreshData.plans.forEach((p: ActivePlan) => {
          newValues[p.id] = String(p.manual_used_gb ?? p.used_gb);
        });
        setEditedValues(newValues);
      }

      setSaving(false);
      setSuccessMsg(`${data.updated} plan(s) updated successfully!`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setError("Something went wrong.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading active plans for bulk update...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header & Sticky Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Bulk Usage Sync
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Synchronize actual consumed data for all active subscriber eSIM bundles simultaneously.
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{plans.length} active bundles</span>
              <span>•</span>
              {changedPlans.length > 0 ? (
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {changedPlans.length} modified (unsaved)
                </span>
              ) : (
                <span className="text-slate-400">All data synchronized</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {changedPlans.length > 0 && (
              <button
                onClick={() => {
                  const initial: Record<string, string> = {};
                  plans.forEach((p) => {
                    initial[p.id] = String(p.used_gb);
                  });
                  setEditedValues(initial);
                }}
                disabled={saving}
                className="px-4 py-2.5 bg-white text-slate-600 text-xs font-semibold rounded-xl
                           border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Discard
              </button>
            )}
            <button
              onClick={handleSaveAll}
              disabled={saving || changedPlans.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl
                         hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all shadow-xs"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save All Changes {changedPlans.length > 0 ? `(${changedPlans.length})` : ""}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="bg-teal-50 text-teal-800 text-xs sm:text-sm px-4 py-3 rounded-xl border border-teal-200 font-semibold flex items-center gap-2 shadow-2xs">
          <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rose-50 text-rose-700 text-xs sm:text-sm px-4 py-3 rounded-xl border border-rose-200 font-semibold flex items-center gap-2 shadow-2xs">
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">No active bundles found</p>
          <p className="text-xs text-slate-400 mt-1">There are currently no active customer plans to update.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left">
                    <th className="px-4 py-3 font-bold text-slate-500">Customer</th>
                    <th className="px-4 py-3 font-bold text-slate-500">Bundle Plan</th>
                    <th className="px-4 py-3 font-bold text-slate-500">Quota (GB)</th>
                    <th className="px-4 py-3 font-bold text-slate-500">Used (GB)</th>
                    <th className="px-4 py-3 font-bold text-slate-500">Utilization</th>
                    <th className="px-4 py-3 font-bold text-slate-500">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.map((plan) => {
                    const currentVal = Number(editedValues[plan.id] || plan.manual_used_gb || plan.used_gb);
                    const totalNum = Number(plan.total_gb);
                    const usagePercent = totalNum > 0 ? Math.round((currentVal / totalNum) * 100) : 0;
                    const isHigh = usagePercent >= 80;
                    const isChanged = editedValues[plan.id] !== undefined && editedValues[plan.id] !== String(plan.manual_used_gb ?? plan.used_gb);

                    const expiry = new Date(plan.expiry_date);
                    const today = new Date();
                    const daysLeft = Math.max(0, Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

                    return (
                      <tr
                        key={plan.id}
                        className={`transition-colors ${isChanged ? "bg-amber-50/70" : "hover:bg-slate-50/50"}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{plan.customer_display_name}</p>
                          <p className="text-slate-400 font-mono text-2xs">@{plan.customer_username}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {plan.plan_name}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                          {totalNum} GB
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={totalNum}
                              value={editedValues[plan.id] ?? String(plan.manual_used_gb ?? plan.used_gb)}
                              onChange={(e) =>
                                setEditedValues((prev) => ({ ...prev, [plan.id]: e.target.value }))
                              }
                              className={`w-24 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold
                                ${
                                  isChanged
                                    ? "border-amber-400 bg-white ring-2 ring-amber-200 text-amber-900"
                                    : "border-slate-300 bg-white text-slate-900"
                                }
                                focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500`}
                            />
                            <span className="text-2xs text-slate-400 font-medium">GB</span>
                          </div>
                          {plan.live_used_gb !== undefined && (
                            <p className="text-3xs text-teal-600 font-medium mt-0.5 whitespace-nowrap font-mono">
                              Live: {plan.live_used_gb.toFixed(2)} GB {plan.daily_rate ? `(~${plan.daily_rate.toFixed(2)} GB/d)` : ""}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <span className={`font-bold font-mono ${isHigh ? "text-rose-600" : "text-slate-700"}`}>
                              {usagePercent}%
                            </span>
                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${isHigh ? "bg-rose-500" : "bg-teal-500"}`}
                                style={{ width: `${Math.min(100, usagePercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono ${daysLeft <= 3 ? "text-amber-600 font-bold" : "text-slate-600"}`}>
                            {expiry.toISOString().split("T")[0]}
                          </span>
                          <span className="text-slate-400 text-2xs ml-1 font-semibold">({daysLeft}d left)</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {plans.map((plan) => {
              const currentVal = Number(editedValues[plan.id] || plan.manual_used_gb || plan.used_gb);
              const totalNum = Number(plan.total_gb);
              const usagePercent = totalNum > 0 ? Math.round((currentVal / totalNum) * 100) : 0;
              const isHigh = usagePercent >= 80;
              const isChanged = editedValues[plan.id] !== undefined && editedValues[plan.id] !== String(plan.manual_used_gb ?? plan.used_gb);

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-4 shadow-2xs transition-all ${
                    isChanged ? "border-amber-300 bg-amber-50/70" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{plan.customer_display_name}</p>
                      <p className="text-2xs text-slate-400 font-mono">@{plan.customer_username}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isHigh ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
                      {usagePercent}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span>{plan.plan_name} • {totalNum} GB</span>
                    <span className="font-mono">{new Date(plan.expiry_date).toISOString().split("T")[0]}</span>
                  </div>

                  {plan.live_used_gb !== undefined && (
                    <p className="text-3xs text-teal-600 font-medium mb-2 font-mono">
                      Live pace: {plan.live_used_gb.toFixed(2)} GB {plan.daily_rate ? `(~${plan.daily_rate.toFixed(2)} GB/d)` : ""}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-700">Used (GB):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalNum}
                      value={editedValues[plan.id] ?? String(plan.manual_used_gb ?? plan.used_gb)}
                      onChange={(e) =>
                        setEditedValues((prev) => ({ ...prev, [plan.id]: e.target.value }))
                      }
                      className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold
                        ${isChanged ? "border-amber-400 bg-white text-amber-900" : "border-slate-300 bg-white text-slate-900"}
                        focus:outline-none focus:ring-2 focus:ring-teal-500/20`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}