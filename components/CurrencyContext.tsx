"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  CurrencyCode,
  CURRENCIES,
  formatPlanPrice,
  getCurrencyForCountry,
} from "@/lib/currency";

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatPrice: (usdPrice: number | string | null | undefined) => {
    formatted: string;
    amount: number;
    symbol: string;
    currency: CurrencyCode;
  };
  detectedCountry: string | null;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "PKR",
  setCurrency: () => {},
  formatPrice: (p) => formatPlanPrice(p, "PKR"),
  detectedCountry: null,
});

export function CurrencyProvider({
  children,
  initialCurrency = "PKR",
  initialCountry = null,
}: {
  children: React.ReactNode;
  initialCurrency?: CurrencyCode;
  initialCountry?: string | null;
}) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(initialCurrency);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(initialCountry);

  useEffect(() => {
    // Check saved preference first
    const saved = localStorage.getItem("preferred_currency") as CurrencyCode | null;
    if (saved && CURRENCIES[saved]) {
      setCurrencyState(saved);
      return;
    }

    // Auto-detect based on visitor IP
    fetch("/api/geo")
      .then((res) => res.json())
      .then((data) => {
        if (data.country) setDetectedCountry(data.country);
        if (data.currency && CURRENCIES[data.currency as CurrencyCode]) {
          setCurrencyState(data.currency as CurrencyCode);
        }
      })
      .catch(() => {
        // Fallback default
        setCurrencyState("PKR");
      });
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    if (CURRENCIES[code]) {
      setCurrencyState(code);
      localStorage.setItem("preferred_currency", code);
    }
  };

  const formatPrice = (usdPrice: number | string | null | undefined) => {
    return formatPlanPrice(usdPrice, currency);
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, formatPrice, detectedCountry }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
