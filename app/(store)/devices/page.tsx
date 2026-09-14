"use client";

import { useState, useMemo } from "react";
import { Search, CheckCircle2, XCircle, HelpCircle, Smartphone } from "lucide-react";
import { devices } from "@/data/devices";
import { siteConfig } from "@/config/site";

const instagramUrl = `https://ig.me/m/${siteConfig.instagramUsername}`;

export default function DevicesPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) => `${d.brand} ${d.model}`.toLowerCase().includes(q));
  }, [query]);

  const statusStyles = {
    compatible: { icon: CheckCircle2, label: "Compatible", className: "text-teal-600 bg-teal-50 border-teal-200" },
    "not-compatible": { icon: XCircle, label: "Not Compatible", className: "text-red-500 bg-red-50 border-red-200" },
    unknown: { icon: HelpCircle, label: "Unknown", className: "text-ink-400 bg-mist-100 border-navy-900/10" },
  } as const;

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          <Smartphone size={13} className="text-teal-600" />
          <span>Device Checker</span>
        </div>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-navy-950 sm:text-4xl">
          eSIM Device Compatibility
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base text-ink-600">
          Search your smartphone model to confirm eSIM support before purchasing a travel bundle.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-md">
        <div className="flex items-center gap-2 rounded-2xl border border-navy-900/15 bg-white px-4 py-3 shadow-xs">
          <Search className="text-ink-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Apple, Samsung, Pixel model..."
            className="w-full bg-transparent text-sm text-navy-950 outline-none placeholder:text-ink-400"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 text-center rounded-2xl border border-navy-900/10 bg-white p-8">
          <p className="text-sm text-ink-600">No devices matched your search.</p>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-navy-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-navy-800"
          >
            Ask on Instagram
          </a>
        </div>
      ) : (
        <div className="mt-10 space-y-3">
          {filtered.map((d) => {
            const style = statusStyles[d.status];
            return (
              <div
                key={d.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-navy-900/10 bg-white px-5 py-4 shadow-2xs hover:border-navy-900/20 transition"
              >
                <div>
                  <p className="font-bold text-navy-950">{d.brand} {d.model}</p>
                  {d.nonPtaNote && (
                    <p className="mt-1 text-xs text-ink-500 leading-relaxed max-w-xl">
                      {d.nonPtaNote}
                    </p>
                  )}
                  {d.regionNotes && (
                    <p className="mt-0.5 text-[11px] text-teal-700 italic">
                      {d.regionNotes}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.className}`}>
                    <style.icon size={15} />
                    {style.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
