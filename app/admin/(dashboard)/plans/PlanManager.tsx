"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  data_amount_gb: string;
  price: string;
  validity_days: number;
  description: string | null;
  instagram_message: string | null;
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
};

export default function PlanManager({ initialPlans }: Props) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  function updateForm(field: string, value: string) {
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
    setTimeout(() => setSuccessMessage(""), 3000);
  }

  async function handleSave(isNew: boolean) {
    setError("");
    setLoading(true);

    const payload = {
      ...(!isNew && { id: editingId }),
      name: form.name,
      data_amount_gb: form.data_amount_gb,
      price: form.price,
      validity_days: Number(form.validity_days),
      description: form.description || null,
      instagram_message: form.instagram_message || null,
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
      showSuccess(isNew ? "Plan created successfully!" : "Plan updated successfully!");
      router.refresh(); // Refresh server data
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // ── Plan Form (reused for Add and Edit) ──────────────
  function renderForm(isNew: boolean) {
    return (
      <div className="bg-white rounded-2xl border border-teal-300/80 p-6 mb-6 shadow-sm animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isNew ? "Create Retail Plan Package" : "Edit Plan Specification"}
            </h3>
            <p className="text-2xs text-slate-400">Updates will reflect live across Browse Plans & AI assistant</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Plan Display Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder="e.g. 15GB Holiday Special"
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
                placeholder="e.g. 15"
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Retail Price (\$)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                \$
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
          const priceNum = Number(plan.price);
          const dataNum = Number(plan.data_amount_gb);
          const perGb = dataNum > 0 ? (priceNum / dataNum).toFixed(2) : null;

          return (
            <div key={plan.id}>
              {editingId === plan.id ? (
                renderForm(false)
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between h-full group">
                  <div>
                    {/* Top Row: Title & Edit */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-2xs uppercase tracking-wider font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                          {plan.validity_days} Days Validity
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1.5 group-hover:text-teal-700 transition-colors">
                          {plan.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => handleEdit(plan)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                        title="Edit Plan"
                        aria-label="Edit Plan"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>

                    {/* Price & Data Amount */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        \${plan.price}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        / {plan.data_amount_gb} GB
                      </span>
                      {perGb && (
                        <span className="text-2xs font-mono text-slate-400 ml-auto">
                          (\${perGb}/GB)
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
    </div>
  );
}