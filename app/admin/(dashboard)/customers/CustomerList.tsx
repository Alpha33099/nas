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
  start_date?: string;
  expiry_date: string;
  status: string;
  last_usage_update_at?: string | null;
  created_at?: string | null;
  liveUsedGb?: number;
}

interface Customer {
  id: string;
  username: string;
  display_name: string;
  last_login_at: string | null;
  created_at: string;
  plans: Plan[] | string;
}

interface Props {
  initialCustomers: Customer[];
}

type SortOption = "newest" | "alphabetical" | "highest-usage" | "expiring-soonest";

function parsePlans(plans: Plan[] | string): Plan[] {
  if (typeof plans === "string") {
    try {
      return JSON.parse(plans);
    } catch {
      return [];
    }
  }
  return plans || [];
}

function formatDate(value: string | Date): string {
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type FilterTab = "all" | "active" | "high-usage" | "expiring";

export default function CustomerList({ initialCustomers }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteUsername, setDeleteUsername] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Process customers
  const customers = initialCustomers.map((c) => {
    const plans = parsePlans(c.plans);
    const activePlans = plans.filter((p) => p.status === "active");

    // Calculate highest usage % among active plans using live auto-rate engine
    let highestUsage = 0;
    let highestLiveGb: number | null = null;
    let highestTotalGb: number | null = null;

    activePlans.forEach((p) => {
      const usage = calculateCurrentUsage({
        ...p,
        total_gb: Number(p.total_gb),
        start_date: p.start_date || new Date().toISOString(),
      });
      if (usage.percentUsed > highestUsage || highestLiveGb === null) {
        highestUsage = usage.percentUsed;
        highestLiveGb = usage.currentUsedGb;
        highestTotalGb = Number(p.total_gb);
      }
    });

    // Find nearest expiry
    let nearestExpiry: Date | null = null;
    activePlans.forEach((p) => {
      const exp = new Date(p.expiry_date);
      if (!nearestExpiry || exp < nearestExpiry) nearestExpiry = exp;
    });

    const today = new Date();
    const daysUntilExpiry = nearestExpiry
      ? Math.ceil((new Date(nearestExpiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...c,
      plans,
      activePlans,
      activePlanCount: activePlans.length,
      highestUsage: Math.round(highestUsage),
      highestLiveGb,
      highestTotalGb,
      nearestExpiry,
      daysUntilExpiry,
    };
  });

  // Filter by search & tab
  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.username.toLowerCase().includes(q) ||
      c.display_name.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterTab === "active") return c.activePlanCount > 0;
    if (filterTab === "high-usage") return c.highestUsage >= 80;
    if (filterTab === "expiring") {
      return c.daysUntilExpiry !== null && c.daysUntilExpiry <= 3 && c.daysUntilExpiry >= 0;
    }

    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "alphabetical":
        return a.username.localeCompare(b.username);
      case "highest-usage":
        return b.highestUsage - a.highestUsage;
      case "expiring-soonest": {
        const aTime = a.nearestExpiry ? new Date(a.nearestExpiry).getTime() : Infinity;
        const bTime = b.nearestExpiry ? new Date(b.nearestExpiry).getTime() : Infinity;
        return aTime - bTime;
      }
      default: // newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);

    try {
      const response = await fetch(`/api/admin/customers?id=${deleteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteId(null);
        setDeleteUsername("");
        router.refresh();
      }
    } catch {
      // silently fail
    }
    setDeleting(false);
  }

  const activeCount = customers.filter((c) => c.activePlanCount > 0).length;
  const highUsageCount = customers.filter((c) => c.highestUsage >= 80).length;
  const expiringCount = customers.filter(
    (c) => c.daysUntilExpiry !== null && c.daysUntilExpiry <= 3 && c.daysUntilExpiry >= 0
  ).length;

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, @username..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800
                         placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20
                         focus:border-teal-500 transition-all bg-slate-50/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700
                         focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500
                         transition-all bg-slate-50/50 font-medium"
            >
              <option value="newest">Newest first</option>
              <option value="alphabetical">A → Z</option>
              <option value="highest-usage">Highest usage</option>
              <option value="expiring-soonest">Expiring soonest</option>
            </select>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterTab === "all"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setFilterTab("active")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterTab === "active"
                ? "bg-teal-700 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Active Plans ({activeCount})
          </button>
          <button
            onClick={() => setFilterTab("high-usage")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterTab === "high-usage"
                ? "bg-rose-700 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            High Usage ≥80% ({highUsageCount})
          </button>
          <button
            onClick={() => setFilterTab("expiring")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterTab === "expiring"
                ? "bg-amber-700 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Expiring Soon ({expiringCount})
          </button>
        </div>
      </div>

      {/* Customer List Items */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">No customers found</p>
          <p className="text-xs text-slate-400 mt-1">
            {search ? `No results matching "${search}".` : "No customers in this category yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((customer) => {
            const initials = customer.display_name
              ? customer.display_name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              : customer.username.slice(0, 2).toUpperCase();

            const isHighUsage = customer.highestUsage >= 80;

            return (
              <div
                key={customer.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 hover:border-slate-300 hover:shadow-xs transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left — Avatar & Customer Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 text-teal-300 text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="text-sm font-bold text-slate-900 hover:text-teal-600 transition-colors truncate"
                        >
                          {customer.display_name}
                        </Link>
                        <span className="text-xs text-slate-400 font-mono">@{customer.username}</span>

                        {/* Status Badges */}
                        {customer.activePlanCount > 0 ? (
                          <span className="inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                            {customer.activePlanCount} {customer.activePlanCount === 1 ? "Active Plan" : "Active Plans"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                            No Active Plan
                          </span>
                        )}

                        {isHighUsage && (
                          <span className="inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            High Usage
                          </span>
                        )}
                      </div>

                      {/* Metadata row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                        {customer.activePlanCount > 0 && customer.highestLiveGb !== null && (
                          <div className="flex items-center gap-2 min-w-[170px]">
                            <span className="text-slate-400">Usage:</span>
                            <span className={`font-semibold ${isHighUsage ? "text-rose-600" : "text-slate-700"}`}>
                              {Number(customer.highestLiveGb).toFixed(1)} / {Number(customer.highestTotalGb)} GB ({customer.highestUsage}%)
                            </span>
                            <div className="w-14 bg-slate-100 rounded-full h-1.5 overflow-hidden inline-block shrink-0">
                              <div
                                className={`h-1.5 rounded-full ${isHighUsage ? "bg-rose-500" : "bg-teal-500"}`}
                                style={{ width: `${Math.min(100, customer.highestUsage)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {customer.nearestExpiry && (
                          <div>
                            <span className="text-slate-400">Nearest Expiry: </span>
                            <span className={`font-medium ${customer.daysUntilExpiry !== null && customer.daysUntilExpiry <= 3 ? "text-amber-600 font-bold" : "text-slate-700"}`}>
                              {formatDate(customer.nearestExpiry)}
                              {customer.daysUntilExpiry !== null && customer.daysUntilExpiry <= 3 && (
                                <span className="text-2xs ml-1 font-semibold">({customer.daysUntilExpiry}d left)</span>
                              )}
                            </span>
                          </div>
                        )}

                        <div>
                          <span className="text-slate-400">Last Login: </span>
                          <span className="text-slate-600">
                            {customer.last_login_at ? formatDate(customer.last_login_at) : "Never"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right — Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-2xs"
                    >
                      <span>Manage</span>
                      <svg className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => {
                        setDeleteId(customer.id);
                        setDeleteUsername(customer.username);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete Customer"
                      aria-label="Delete Customer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Delete Customer Account</h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong className="text-slate-900 font-mono">@{deleteUsername}</strong>? This will remove all active plans and release linked eSIMs. This action cannot be reversed.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeleteUsername("");
                }}
                className="flex-1 py-2 px-3 bg-white text-slate-700 font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 px-3 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors text-xs shadow-xs"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}