"use client";

import { useState, useEffect } from "react";

interface LogEntry {
  id: string;
  action: string;
  target_type: string;
  details: string;
  created_at: string;
  admin_username: string;
}

const actionLabels: Record<string, string> = {
  created_customer: "Created customer",
  deleted_customer: "Deleted customer",
  reset_password: "Reset password",
  assigned_plan: "Added plan",
  bulk_usage_update: "Bulk usage update",
  created_plan: "Created plan",
  updated_plan: "Updated plan",
  created_esim: "Added eSIM",
};

const actionColors: Record<string, string> = {
  created_customer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  deleted_customer: "bg-rose-50 text-rose-700 border-rose-200",
  reset_password: "bg-amber-50 text-amber-700 border-amber-200",
  assigned_plan: "bg-blue-50 text-blue-700 border-blue-200",
  bulk_usage_update: "bg-purple-50 text-purple-700 border-purple-200",
  created_plan: "bg-teal-50 text-teal-700 border-teal-200",
  updated_plan: "bg-teal-50 text-teal-700 border-teal-200",
  created_esim: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/admin/activity-log");
        const data = await res.json();
        if (data.success) setLogs(data.logs);
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading audit history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          System Audit Trail
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Historical log of administrative actions, provisioning events, and quota modifications.
        </p>
        <p className="text-xs text-slate-400 mt-2 font-medium">
          Showing last {logs.length} logged actions
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">No activity recorded</p>
          <p className="text-xs text-slate-400 mt-1">Audit trail will appear here as administrative actions occur.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 shadow-2xs overflow-hidden">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <span
                  className={`text-2xs font-bold px-2.5 py-1 rounded-md border shrink-0 ${
                    actionColors[log.action] || "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {actionLabels[log.action] || log.action}
                </span>
                <span className="text-xs sm:text-sm font-medium text-slate-800 break-words">
                  {log.details}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0 self-start sm:self-auto pl-1 sm:pl-0">
                <span className="inline-flex items-center gap-1 font-mono text-2xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {log.admin_username || "System"}
                </span>
                <span className="text-2xs font-mono">
                  {new Date(log.created_at).toISOString().replace("T", " ").substring(0, 16)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}