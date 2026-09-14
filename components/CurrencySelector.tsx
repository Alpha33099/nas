"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrency } from "./CurrencyContext";
import { CURRENCIES, CurrencyCode } from "@/lib/currency";
import { ChevronDown, Globe } from "lucide-react";

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentConfig = CURRENCIES[currency] || CURRENCIES.PKR;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border border-navy-900/10 bg-white/80 px-2.5 py-1 text-xs font-medium text-navy-950 shadow-xs backdrop-blur-xs transition hover:bg-white hover:border-navy-900/20"
        title="Change currency"
      >
        <span>{currentConfig.flag}</span>
        <span className="font-semibold">{currentConfig.code}</span>
        <ChevronDown size={13} className={`text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-48 rounded-xl border border-navy-900/10 bg-white p-1.5 shadow-xl">
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-ink-400 uppercase">
            Select Currency
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {Object.values(CURRENCIES).map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setCurrency(c.code as CurrencyCode);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition ${
                  currency === c.code
                    ? "bg-teal-50 font-semibold text-teal-700"
                    : "text-navy-950 hover:bg-mist-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span>{c.code}</span>
                  <span className="text-ink-400">({c.symbol})</span>
                </span>
                {currency === c.code && (
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
