"use client";

import { useState, useEffect } from "react";

interface Esim {
  id: string;
  provider_name: string;
  provider_email?: string;
  provider_password?: string;
  activation_code: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  assigned_to_username: string | null;
  assigned_to_name: string | null;
}

export default function EsimsPage() {
  const [esims, setEsims] = useState<Esim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Add Form fields
  const [providerName, setProviderName] = useState("");
  const [providerEmail, setProviderEmail] = useState("");
  const [providerPassword, setProviderPassword] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [notes, setNotes] = useState("");

  // Edit State
  const [editingEsim, setEditingEsim] = useState<Esim | null>(null);
  const [editProviderName, setEditProviderName] = useState("");
  const [editProviderEmail, setEditProviderEmail] = useState("");
  const [editProviderPassword, setEditProviderPassword] = useState("");
  const [editActivationCode, setEditActivationCode] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("available");
  const [updating, setUpdating] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Filter
  const [filter, setFilter] = useState<"all" | "available" | "assigned">("all");

  async function fetchEsims() {
    try {
      const res = await fetch("/api/admin/esims");
      const data = await res.json();
      if (data.success) setEsims(data.esims);
    } catch {
      setError("Failed to load eSIMs.");
    }
    setLoading(false);
  }

  useEffect(() => { fetchEsims(); }, []);

  function resetForm() {
    setProviderName("");
    setProviderEmail("");
    setProviderPassword("");
    setActivationCode("");
    setNotes("");
    setShowAddForm(false);
    setError("");
  }

  function startEdit(esim: Esim) {
    setEditingEsim(esim);
    setEditProviderName(esim.provider_name);
    setEditProviderEmail(esim.provider_email || "");
    setEditProviderPassword(esim.provider_password || "");
    setEditActivationCode(esim.activation_code || "");
    setEditNotes(esim.notes || "");
    setEditStatus(esim.status);
    setError("");
  }

  async function handleUpdate() {
    if (!editingEsim || !editProviderName) {
      setError("Provider name is required.");
      return;
    }

    setUpdating(true);
    setError("");

    try {
      const res = await fetch("/api/admin/esims", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEsim.id,
          provider_name: editProviderName,
          provider_email: editProviderEmail,
          provider_password: editProviderPassword,
          activation_code: editActivationCode || null,
          notes: editNotes || null,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update eSIM.");
        setUpdating(false);
        return;
      }

      setEditingEsim(null);
      setUpdating(false);
      setSuccessMsg("Carrier info updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchEsims();
    } catch {
      setError("Failed to update carrier info.");
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/esims?id=${deleteId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete eSIM.");
        setDeleting(false);
        return;
      }

      setDeleteId(null);
      setDeleting(false);
      setSuccessMsg("eSIM deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchEsims();
    } catch {
      setError("Failed to delete eSIM.");
      setDeleting(false);
    }
  }

  async function handleAdd() {
    if (!providerName || !providerEmail || !providerPassword) {
      setError("Provider name, email, and password are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/esims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_name: providerName,
          provider_email: providerEmail,
          provider_password: providerPassword,
          activation_code: activationCode || null,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create eSIM.");
        setSaving(false);
        return;
      }

      resetForm();
      setSaving(false);
      setSuccessMsg("eSIM added successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchEsims();
    } catch {
      setError("Something went wrong.");
      setSaving(false);
    }
  }

  const filtered = esims.filter((e) => {
    if (filter === "available") return e.status === "available";
    if (filter === "assigned") return e.status === "assigned";
    return true;
  });

  const availableCount = esims.filter((e) => e.status === "available").length;
  const assignedCount = esims.filter((e) => e.status === "assigned").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading eSIM inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            eSIM Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Store carrier master credentials, activation codes, and assignable stock securely.
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{esims.length} total profiles</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">{availableCount} available</span>
            <span>•</span>
            <span className="text-slate-600 font-semibold">{assignedCount} assigned</span>
          </div>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl
                       hover:bg-slate-800 transition-all shadow-xs shrink-0 self-start sm:self-auto"
          >
            <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add eSIM Profile</span>
          </button>
        )}
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

      {/* Error Toast */}
      {error && (
        <div className="bg-rose-50 text-rose-700 text-xs sm:text-sm px-4 py-3 rounded-xl border border-rose-200 font-semibold flex items-center gap-2 shadow-2xs">
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Add Form Card */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-teal-300/80 p-6 shadow-sm animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Inventory eSIM</h3>
              <p className="text-2xs text-slate-400">Carrier credentials are encrypted with AES-256-GCM before storage</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Provider Name</label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g. Airalo, eSIM.net, Simly"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Carrier Account Email</label>
              <input
                type="email"
                value={providerEmail}
                onChange={(e) => setProviderEmail(e.target.value)}
                placeholder="Account email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Carrier Account Password</label>
              <input
                type="password"
                value={providerPassword}
                onChange={(e) => setProviderPassword(e.target.value)}
                placeholder="Account password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Activation Code (LPA string)</label>
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="Optional LPA code"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-mono
                           focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Internal Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional reference notes"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex gap-2.5 mt-5">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl
                         hover:bg-slate-800 disabled:opacity-50 transition-colors text-xs shadow-xs"
            >
              {saving ? "Encrypting & Storing..." : "Save eSIM to Stock"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2.5 bg-white text-slate-700 font-semibold rounded-xl
                         border border-slate-300 hover:bg-slate-50 transition-colors text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs">
        <button
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === "all"
              ? "bg-slate-900 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Inventory ({esims.length})
        </button>
        <button
          onClick={() => setFilter("available")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === "available"
              ? "bg-emerald-700 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Available Stock ({availableCount})
        </button>
        <button
          onClick={() => setFilter("assigned")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === "assigned"
              ? "bg-slate-800 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Assigned to Customers ({assignedCount})
        </button>
      </div>

      {/* eSIM List Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">No eSIM profiles found</p>
          <p className="text-xs text-slate-400 mt-1">
            {filter === "all"
              ? "Click \"Add eSIM Profile\" to input your first provider stock."
              : `No ${filter} eSIM profiles match this filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((esim) => (
            <div
              key={esim.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 hover:border-slate-300 hover:shadow-xs transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-teal-300 flex items-center justify-center shrink-0 shadow-2xs">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {esim.provider_name}
                      </h3>
                      <span
                        className={`text-2xs font-bold px-2 py-0.5 rounded-md border
                          ${esim.status === "available"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                      >
                        {esim.status === "available" ? "Ready in Stock" : "Assigned"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      {esim.assigned_to_name ? (
                        <div>
                          <span className="text-slate-400">Subscriber: </span>
                          <span className="font-semibold text-slate-800">{esim.assigned_to_name}</span>
                          <span className="font-mono text-slate-400 text-2xs ml-1">(@{esim.assigned_to_username})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-2xs">Unassigned — available for allocation</span>
                      )}

                      {esim.activation_code && (
                        <div>
                          <span className="text-slate-400">LPA Code: </span>
                          <span className="font-mono font-medium text-slate-700">{esim.activation_code}</span>
                        </div>
                      )}

                      {esim.notes && (
                        <div className="italic text-slate-400">
                          &ldquo;{esim.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <div className="text-right mr-2 hidden sm:block">
                    <p className="text-2xs text-slate-400 font-mono">
                      ID: {esim.id.slice(0, 8)}
                    </p>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      Added {new Date(esim.created_at).toISOString().split("T")[0]}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(esim)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-2xs"
                    title="Edit Carrier Info & Credentials"
                  >
                    <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setDeleteId(esim.id);
                      setDeleteName(esim.provider_name);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200"
                    title="Delete eSIM Profile"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit eSIM Modal ────────────────────────────────────────── */}
      {editingEsim && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Carrier Info</h3>
                  <p className="text-2xs text-slate-400">Update carrier credentials and LPA allocation details</p>
                </div>
              </div>
              <button
                onClick={() => setEditingEsim(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Provider / Carrier Name</label>
                <input
                  type="text"
                  value={editProviderName}
                  onChange={(e) => setEditProviderName(e.target.value)}
                  placeholder="e.g. Airalo, eSIM.net, Simly"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Carrier Account Email</label>
                  <input
                    type="email"
                    value={editProviderEmail}
                    onChange={(e) => setEditProviderEmail(e.target.value)}
                    placeholder="account@carrier.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Carrier Password</label>
                  <input
                    type="text"
                    value={editProviderPassword}
                    onChange={(e) => setEditProviderPassword(e.target.value)}
                    placeholder="Carrier password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Activation Code (LPA String)</label>
                <input
                  type="text"
                  value={editActivationCode}
                  onChange={(e) => setEditActivationCode(e.target.value)}
                  placeholder="LPA:1$..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inventory Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 bg-white font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="available">Ready in Stock (Available)</option>
                    <option value="assigned">Assigned to Customer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Internal Reference Notes</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={handleUpdate}
                disabled={updating || !editProviderName}
                className="flex-1 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors text-xs shadow-xs"
              >
                {updating ? "Saving Changes..." : "Save Carrier Info"}
              </button>
              <button
                onClick={() => setEditingEsim(null)}
                className="px-4 py-2.5 bg-white text-slate-700 font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Delete eSIM Profile?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Are you sure you want to permanently delete the eSIM for <strong className="text-slate-800 font-semibold">{deleteName}</strong>? Any linked customer plan will be unlinked.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {deleting ? "Deleting..." : "Yes, Delete eSIM"}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-white text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}