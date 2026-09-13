"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  data_amount_gb: string;
  price: string;
  validity_days: number;
}

interface AvailableEsim {
  id: string;
  provider_name: string;
}

interface Props {
  plans: Plan[];
  availableEsims: AvailableEsim[];
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export default function CreateCustomerForm({ plans, availableEsims }: Props) {
  const router = useRouter();

  // Customer fields
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // eSIM fields
  const [esimType, setEsimType] = useState<"none" | "new" | "existing">("none");
  const [esimId, setEsimId] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerEmail, setProviderEmail] = useState("");
  const [providerPassword, setProviderPassword] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [esimNotes, setEsimNotes] = useState("");

  // Plan fields
  const [planCatalogId, setPlanCatalogId] = useState("");
  const [startDate, setStartDate] = useState(getTodayString());

  // UI state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdPassword, setCreatedPassword] = useState("");
  const [copied, setCopied] = useState(false);

  // Calculate expiry preview
  const selectedPlan = plans.find((p) => p.id === planCatalogId);
  let expiryPreview = "";
  if (selectedPlan && startDate) {
    const expiry = new Date(startDate);
    expiry.setDate(expiry.getDate() + selectedPlan.validity_days);
    expiryPreview = expiry.toLocaleDateString();
  }

  function handleGeneratePassword() {
    const newPassword = generatePassword();
    setPassword(newPassword);
    setShowPassword(true);
  }

  async function handleCopyPassword() {
    await navigator.clipboard.writeText(createdPassword || password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Build eSIM payload
    let esimPayload = null;
    if (esimType === "new") {
      esimPayload = {
        type: "new",
        provider_name: providerName,
        provider_email: providerEmail,
        provider_password: providerPassword,
        activation_code: activationCode || null,
        notes: esimNotes || null,
      };
    } else if (esimType === "existing") {
      esimPayload = { type: "existing", esim_id: esimId };
    }

    try {
      const response = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          display_name: displayName,
          esim: esimPayload,
          plan: {
            plan_catalog_id: planCatalogId,
            start_date: startDate,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create customer.");
        setLoading(false);
        return;
      }

      // Show success with password
      setCreatedPassword(password);
      setSuccess(true);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // ── Success Modal ─────────────────────────────────────
  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-600 shadow-2xs">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Customer Provisioned!</h2>
          <p className="text-xs text-slate-500 mt-1">
            Account was created successfully. Please copy the temporary credentials below.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <p className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">Username</p>
            <p className="font-mono text-sm font-semibold text-slate-900">{username}</p>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Temporary Password (Shown Once)</span>
              </div>
              <button
                onClick={handleCopyPassword}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 bg-white border border-amber-200 px-2.5 py-1 rounded-lg shadow-2xs transition-colors"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-sm font-bold text-slate-800 break-all select-all mt-2">
              {createdPassword}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/admin/customers")}
            className="flex-1 py-2.5 px-4 bg-slate-900 text-white text-xs font-semibold rounded-xl
                       hover:bg-slate-800 transition-colors shadow-xs"
          >
            Go to Directory
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-2.5 px-4 bg-white text-slate-700 text-xs font-semibold rounded-xl
                       border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Add Another
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* ── Customer Details ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">1. Subscriber Account Details</h2>
            <p className="text-2xs text-slate-400">Login username and primary identity</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              required
              placeholder="e.g. john.doe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                         placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20
                         focus:border-teal-500 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="e.g. John Doe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                         placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20
                         focus:border-teal-500 transition-all"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Account Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter or generate a strong password"
                  className="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                             placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20
                             focus:border-teal-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl
                           transition-colors text-xs whitespace-nowrap shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Generate</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Plan ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">2. Initial Data Package</h2>
            <p className="text-2xs text-slate-400">Select bundle and activation commencement date</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Catalog Plan</label>
            <select
              value={planCatalogId}
              onChange={(e) => setPlanCatalogId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                         focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500
                         transition-all bg-white"
            >
              <option value="">Select a package...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.data_amount_gb} GB — \${p.price} — {p.validity_days} days
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                         focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500
                         transition-all bg-white"
            />
          </div>

          {expiryPreview && (
            <div className="sm:col-span-2 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-500">Calculated Expiry Date:</span>
              <span className="font-bold text-teal-700 font-mono">{expiryPreview}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── eSIM ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">3. eSIM Profile (Optional)</h2>
            <p className="text-2xs text-slate-400">Attach existing inventory or provision new credentials</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(["none", "new", "existing"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setEsimType(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                esimType === type
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type === "none" ? "No eSIM Right Now" : type === "new" ? "New eSIM Credentials" : "Attach Available eSIM"}
            </button>
          ))}
        </div>

        {esimType === "new" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Carrier / Provider</label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                required
                placeholder="e.g. Airalo, Simly"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Provider Email</label>
              <input
                type="email"
                value={providerEmail}
                onChange={(e) => setProviderEmail(e.target.value)}
                required
                placeholder="carrier account email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Provider Password</label>
              <input
                type="password"
                value={providerPassword}
                onChange={(e) => setProviderPassword(e.target.value)}
                required
                placeholder="carrier account password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Activation Code (Optional)</label>
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="LPA:1$..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 font-mono
                           focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Internal Notes (Optional)</label>
              <textarea
                value={esimNotes}
                onChange={(e) => setEsimNotes(e.target.value)}
                placeholder="Any special handling, ICCID, or notes"
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                           focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
              />
            </div>
          </div>
        )}

        {esimType === "existing" && (
          <div className="pt-2">
            {availableEsims.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                No unassigned eSIMs in inventory. Choose &quot;New eSIM Credentials&quot; to add one directly.
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Inventory eSIM</label>
                <select
                  value={esimId}
                  onChange={(e) => setEsimId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900
                             focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">Choose an available eSIM...</option>
                  {availableEsims.map((esim) => (
                    <option key={esim.id} value={esim.id}>
                      {esim.provider_name} (ID: {esim.id.slice(0, 8)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Error ────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-50 text-rose-700 text-xs font-semibold px-4 py-3 rounded-xl border border-rose-200">
          {error}
        </div>
      )}

      {/* ── Submit ───────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl
                     hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
        >
          {loading ? "Provisioning Customer..." : "Provision Customer Account"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/customers")}
          className="px-5 py-2.5 bg-white text-slate-700 text-xs font-semibold rounded-xl
                     border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}