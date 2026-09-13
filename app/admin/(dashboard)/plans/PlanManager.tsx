"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface Plan {
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
  initialPlans: Plan[];
}

const emptyForm = {
  name: "",
  data_amount_gb: "",
  price: "",
  validity_days: "",
  description: "",
  instagram_message: "",
  is_highlighted: false,
  is_on_sale: false,
  sale_price: "",
  badge_text: "",
};

export default function PlanManager({ initialPlans }: Props) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Delete modal state
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function updateForm<K extends keyof typeof emptyForm>(field: K, value: (typeof emptyForm)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowAddForm(true);
    setError("");
  }

  function handleEdit(plan: Plan) {
    setShowAddForm(false);
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      data_amount_gb: String(plan.data_amount_gb),
      price: String(plan.price),
      validity_days: String(plan.validity_days),
      description: plan.description || "",
      instagram_message: plan.instagram_message || "",
      is_highlighted: Boolean(plan.is_highlighted),
      is_on_sale: Boolean(plan.is_on_sale),
      sale_price: plan.sale_price ? String(plan.sale_price) : "",
      badge_text: plan.badge_text || "",
    });
    setError("");
  }

  function handleCancel() {
    setShowAddForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 4000);
  }

  async function handleSave(isNew: boolean) {
    setError("");
    setLoading(true);

    if (form.is_on_sale && (!form.sale_price || Number(form.sale_price) <= 0)) {
      setError("Please enter a valid sale price when Put on Sale is enabled.");
      setLoading(false);
      return;
    }

    const payload = {
      ...(!isNew && { id: editingId }),
      name: form.name,
      data_amount_gb: form.data_amount_gb,
      price: form.price,
      validity_days: Number(form.validity_days),
      description: form.description || null,
      instagram_message: form.instagram_message || null,
      is_highlighted: form.is_highlighted,
      is_on_sale: form.is_on_sale,
      sale_price: form.is_on_sale && form.sale_price ? form.sale_price : null,
      badge_text: form.badge_text ? form.badge_text.trim() : null,
    };

    try {
      const response = await fetch("/api/admin/plans", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save plan.");
        setLoading(false);
        return;
      }

      handleCancel();
      setLoading(false);
      showSuccess(isNew ? `Plan "${form.name}" created successfully!` : `Plan "${form.name}" updated successfully!`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please check your network and try again.");
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!planToDelete) return;
    setDeleteError("");
    setDeleteLoading(true);

    try {
      const response = await fetch(`/api/admin/plans?id=${planToDelete.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error || "Failed to delete plan.");
        setDeleteLoading(false);
        return;
      }

      const deletedName = planToDelete.name;
      setPlanToDelete(null);
      setDeleteLoading(false);
      showSuccess(data.message || `Plan "${deletedName}" was removed from the catalog.`);
      router.refresh();
    } catch {
      setDeleteError("Network error while attempting to delete plan.");
      setDeleteLoading(false);
    }
  }

  // ── Plan Form (reused for Add and Edit) ──────────────
  function renderForm(isNew: boolean) {
    return (
      <div className="bg-white rounded-2xl border border-teal-300/80 p-6 mb-6 shadow-md animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isNew ? "Create Retail Plan Package" : `Edit Plan: ${form.name || "Package"}`}
            </h3>
            <p className="text-2xs text-slate-400">Updates reflect live across Browse Plans, Customer Portal & AI assistant</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Plan Display Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder="e.g. 16GB Special Roam"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                         placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20
                         focus:border-teal-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Data Amount (GB)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.data_amount_gb}
                onChange={(e) => updateForm("data_amount_gb", e.target.value)}
                placeholder="e.g. 16"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                           placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20
                           focus:border-teal-500 transition-all font-mono"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                GB
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Regular Retail Price ($)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.price}
                onChange={(e) => updateForm("price", e.target.value)}
                placeholder="e.g. 29.99"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                           placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20
                           focus:border-teal-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Validity Duration (Days)</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={form.validity_days}
                onChange={(e) => updateForm("validity_days", e.target.value)}
                placeholder="e.g. 30"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                           placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20
                           focus:border-teal-500 transition-all font-mono"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                Days
              </span>
            </div>
          </div>

          {/* ── HIGHLIGHT & SALE TOGGLES SECTION ── */}
          <div className="sm:col-span-2 p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Highlight toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_highlighted}
                  onChange={(e) => updateForm("is_highlighted", e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 transition-colors"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Highlight / Feature Plan
                  </span>
                  <p className="text-2xs text-slate-500">Decorates this card with a prominent border and spotlight styling</p>
                </div>
              </label>

              {/* Sale toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_on_sale}
                  onChange={(e) => updateForm("is_on_sale", e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 transition-colors"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Put on Sale / Special Offer
                  </span>
                  <p className="text-2xs text-slate-500">Shows discounted price with original price strike-through</p>
                </div>
              </label>
            </div>

            {/* Sale fields (visible when is_on_sale is checked) */}
            {form.is_on_sale && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200/80 animate-in fade-in duration-100">
                <div>
                  <label className="block text-2xs font-bold text-rose-700 mb-1">
                    Special Offer / Sale Price ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-500">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={form.sale_price}
                      onChange={(e) => updateForm("sale_price", e.target.value)}
                      placeholder="e.g. 19.99"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-rose-300 bg-white text-xs font-bold text-rose-900
                                 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                  {form.price && form.sale_price && Number(form.price) > Number(form.sale_price) && (
                    <p className="text-2xs font-semibold text-rose-600 mt-1">
                      Customer saves ${(Number(form.price) - Number(form.sale_price)).toFixed(2)} (
                      {Math.round(((Number(form.price) - Number(form.sale_price)) / Number(form.price)) * 100)}% off)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">
                    Custom Badge Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.badge_text}
                    onChange={(e) => updateForm("badge_text", e.target.value)}
                    placeholder="e.g. Limited Offer, 30% OFF, Best Value"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800
                               focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Plan Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              placeholder="e.g. High-speed 5G roaming across 140+ countries. Tethering enabled."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                         placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20
                         focus:border-teal-500 transition-all"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Instagram Checkout Message</label>
            <input
              type="text"
              value={form.instagram_message}
              onChange={(e) => updateForm("instagram_message", e.target.value)}
              placeholder="e.g. Hi! I'd like to order the 15GB eSIM package for $29.99."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                         placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20
                         focus:border-teal-500 transition-all font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-rose-50 text-rose-700 text-xs font-semibold px-4 py-3 rounded-xl border border-rose-200">
            {error}
          </div>
        )}

        <div className="flex gap-2.5 mt-5">
          <button
            onClick={() => handleSave(isNew)}
            disabled={loading}
            className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl
                       hover:bg-slate-800 disabled:opacity-50 transition-colors text-xs shadow-xs"
          >
            {loading ? "Saving Plan..." : isNew ? "Create Plan" : "Save Changes"}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2.5 bg-white text-slate-700 font-semibold rounded-xl
                       border border-slate-300 hover:bg-slate-50 transition-colors text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success Toast */}
      {successMessage && (
        <div className="bg-teal-50 text-teal-800 text-xs sm:text-sm px-4 py-3 rounded-xl border border-teal-200 font-semibold flex items-center gap-2 shadow-2xs">
          <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Add Button */}
      {!showAddForm && (
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl
                     hover:bg-slate-800 transition-all shadow-xs"
        >
          <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Package</span>
        </button>
      )}

      {/* Add Form */}
      {showAddForm && renderForm(true)}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialPlans.map((plan) => {
          const regularPrice = Number(plan.price);
          const isOnSale = Boolean(plan.is_on_sale) && plan.sale_price !== null && plan.sale_price !== undefined && Number(plan.sale_price) > 0;
          const effectivePrice = isOnSale ? Number(plan.sale_price) : regularPrice;
          const dataNum = Number(plan.data_amount_gb);
          const perGb = dataNum > 0 ? (effectivePrice / dataNum).toFixed(2) : null;
          const isHighlighted = Boolean(plan.is_highlighted);

          return (
            <div key={plan.id}>
              {editingId === plan.id ? (
                renderForm(false)
              ) : (
                <div
                  className={`bg-white rounded-2xl p-5 transition-all flex flex-col justify-between h-full relative group ${
                    isHighlighted
                      ? "border-2 border-teal-500 shadow-md ring-2 ring-teal-500/10 bg-gradient-to-b from-teal-50/20 to-white"
                      : "border border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  {/* Highlighted ribbon badge */}
                  {isHighlighted && (
                    <div className="absolute -top-3 right-4 bg-teal-600 text-white text-2xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                      <svg className="w-3 h-3 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span>Featured</span>
                    </div>
                  )}

                  <div>
                    {/* Top Row: Badges & Action Buttons */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-2xs uppercase tracking-wider font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                          {plan.validity_days} Days
                        </span>

                        {isOnSale && (
                          <span className="text-2xs uppercase tracking-wider font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <svg className="w-2.5 h-2.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {plan.badge_text || "SALE"}
                          </span>
                        )}

                        {!isOnSale && plan.badge_text && (
                          <span className="text-2xs uppercase tracking-wider font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                            {plan.badge_text}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons: Edit and Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Plan"
                          aria-label="Edit Plan"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => setPlanToDelete(plan)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Plan"
                          aria-label="Delete Plan"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-teal-700 transition-colors">
                      {plan.name}
                    </h3>

                    {/* Price & Data Amount */}
                    <div className="flex items-baseline gap-2 mb-3">
                      {isOnSale ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-extrabold text-rose-600 tracking-tight">
                            ${Number(plan.sale_price).toFixed(2)}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 line-through">
                            ${regularPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                          ${regularPrice.toFixed(2)}
                        </span>
                      )}

                      <span className="text-xs font-semibold text-slate-500">
                        / {plan.data_amount_gb} GB
                      </span>

                      {perGb && (
                        <span className="text-2xs font-mono text-slate-400 ml-auto">
                          (${perGb}/GB)
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  {/* Footer: Instagram message preview */}
                  {plan.instagram_message && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-2xs uppercase tracking-wider text-slate-400 font-bold mb-1">
                        IG Order Message:
                      </p>
                      <p className="text-2xs text-slate-600 font-mono bg-slate-50 p-2 rounded-lg truncate">
                        &ldquo;{plan.instagram_message}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {initialPlans.length === 0 && !showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">No plans created yet</p>
          <p className="text-xs text-slate-400 mt-1">Click &quot;Create New Package&quot; to define your first catalog bundle.</p>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {planToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Plan Package
                </h3>
                <p className="text-xs text-slate-500">
                  Remove package from active catalog
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-800">{planToDelete.name}</span>
                <span className="text-xs font-mono font-semibold text-slate-600">
                  ${Number(planToDelete.is_on_sale && planToDelete.sale_price ? planToDelete.sale_price : planToDelete.price).toFixed(2)} / {planToDelete.data_amount_gb} GB
                </span>
              </div>
              <p className="text-2xs text-slate-400 mt-1">
                Validity: {planToDelete.validity_days} Days
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to delete this plan? If any existing subscribers have this plan assigned, it will be safely retired from the catalog without affecting customer data or history.
            </p>

            {deleteError && (
              <div className="mb-4 bg-rose-50 text-rose-700 text-xs font-semibold px-3 py-2 rounded-xl border border-rose-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setPlanToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Plan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}