"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Globe } from "lucide-react";
import { countries } from "@/data/countries";

export default function CoveragePage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q));
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof countries>();
    for (const c of filtered) {
      const list = map.get(c.region) ?? [];
      list.push(c);
      map.set(c.region, list);
    }
    return map;
  }, [filtered]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/20 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          <Globe size={13} className="text-teal-600" />
          <span>Worldwide Coverage</span>
        </div>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-navy-950 sm:text-4xl">
          Global Country Coverage
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base text-ink-600">
          Search for a destination to verify eSIM compatibility and local network coverage.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-md">
        <div className="flex items-center gap-2 rounded-2xl border border-navy-900/15 bg-white px-4 py-3 shadow-xs">
          <Search className="text-ink-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search destination (e.g. Turkey, USA, UK, UAE)..."
            className="w-full bg-transparent text-sm text-navy-950 outline-none placeholder:text-ink-400"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mx-auto mt-12 max-w-md rounded-2xl border border-navy-900/10 bg-white p-8 text-center shadow-xs">
          <p className="text-sm text-ink-600">No destinations matched your search. Message us on Instagram to confirm coverage for this country.</p>
        </div>
      ) : (
        <div className="mt-12 space-y-10">
          {Array.from(grouped.entries()).map(([region, list]) => (
            <div key={region}>
              <h2 className="font-display text-lg font-bold text-navy-950 border-b border-navy-900/10 pb-2">
                {region}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => (
                  <Link
                    key={c.code}
                    href={`/coverage/${c.code.toLowerCase()}`}
                    className="flex items-center justify-between rounded-xl border border-navy-900/10 bg-white px-4 py-3 text-sm transition hover:border-teal-500 hover:shadow-xs"
                  >
                    <span className="font-semibold text-navy-950">{c.name}</span>
                    <span
                      className={
                        c.supported
                          ? "text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full"
                          : "text-xs font-semibold text-ink-400"
                      }
                    >
                      {c.supported ? "Supported" : "Unavailable"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
