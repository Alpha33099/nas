"use client";

import { useState } from "react";

export default function ExportPage() {
  const [downloading, setDownloading] = useState(false);

  async function handleExport() {
    setDownloading(true);
    try {
      const res = await fetch("/api/admin/export");
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simvaya-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    }
    setDownloading(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Data Export Center
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate comprehensive audit exports and CSV spreadsheets for offline reporting.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Subscriber & Plan Database Snapshot
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Export all customer accounts, bundle allocations, consumed GB, activation & expiry dates, and account status into a single structured CSV.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2.5 mb-6 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span><strong>Included fields:</strong> Username, Display Name, Bundle Name, Total GB, Used GB, Commencement, Expiry, Status</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span><strong>Excluded for security:</strong> Passwords, unhashed credentials, carrier master keys</span>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl
                     hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs"
        >
          {downloading ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Generating CSV Export...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download CSV Spreadsheet</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}