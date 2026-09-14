export type CurrencyCode = "PKR" | "USD" | "GBP" | "EUR" | "AED" | "SAR" | "CAD" | "AUD";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rateFromUsd: number; // multiplier from base USD
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  PKR: {
    code: "PKR",
    symbol: "₨",
    name: "Pakistani Rupee",
    flag: "🇵🇰",
    rateFromUsd: 282,
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    flag: "🇺🇸",
    rateFromUsd: 1.0,
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    flag: "🇬🇧",
    rateFromUsd: 0.79,
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    flag: "🇪🇺",
    rateFromUsd: 0.92,
  },
  AED: {
    code: "AED",
    symbol: "د.إ",
    name: "UAE Dirham",
    flag: "🇦🇪",
    rateFromUsd: 3.67,
  },
  SAR: {
    code: "SAR",
    symbol: "﷼",
    name: "Saudi Riyal",
    flag: "🇸🇦",
    rateFromUsd: 3.75,
  },
  CAD: {
    code: "CAD",
    symbol: "CA$",
    name: "Canadian Dollar",
    flag: "🇨🇦",
    rateFromUsd: 1.36,
  },
  AUD: {
    code: "AUD",
    symbol: "AU$",
    name: "Australian Dollar",
    flag: "🇦🇺",
    rateFromUsd: 1.52,
  },
};

const COUNTRY_CURRENCY_MAP: Record<string, CurrencyCode> = {
  PK: "PKR",
  US: "USD",
  GB: "GBP",
  AE: "AED",
  SA: "SAR",
  CA: "CAD",
  AU: "AUD",
  // Eurozone
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  PT: "EUR",
  AT: "EUR",
  GR: "EUR",
  IE: "EUR",
  FI: "EUR",
  CH: "EUR",
  TR: "USD",
};

/**
 * Maps a two-letter ISO country code to default currency
 */
export function getCurrencyForCountry(countryCode: string | null | undefined): CurrencyCode {
  if (!countryCode) return "USD";
  const upper = countryCode.toUpperCase();
  return COUNTRY_CURRENCY_MAP[upper] || "USD";
}

/**
 * Format a base USD price into the target currency with commercial clean rounding
 */
export function formatPlanPrice(
  usdPrice: number | string | null | undefined,
  currencyCode: CurrencyCode = "USD"
): { formatted: string; amount: number; symbol: string; currency: CurrencyCode } {
  if (usdPrice === null || usdPrice === undefined || usdPrice === "") {
    const config = CURRENCIES[currencyCode] || CURRENCIES.USD;
    return { formatted: `${config.symbol} —`, amount: 0, symbol: config.symbol, currency: currencyCode };
  }

  const num = typeof usdPrice === "string" ? parseFloat(usdPrice) : usdPrice;
  if (isNaN(num)) {
    const config = CURRENCIES[currencyCode] || CURRENCIES.USD;
    return { formatted: `${config.symbol} —`, amount: 0, symbol: config.symbol, currency: currencyCode };
  }

  const config = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const rawConverted = num * config.rateFromUsd;

  let roundedAmount: number;
  let formattedString: string;

  if (currencyCode === "PKR") {
    // Clean commercial rounding for PKR (nearest 10 or 50)
    if (rawConverted > 1000) {
      roundedAmount = Math.round(rawConverted / 50) * 50;
    } else {
      roundedAmount = Math.round(rawConverted / 10) * 10;
    }
    formattedString = `${config.code} ${roundedAmount.toLocaleString()}`;
  } else if (currencyCode === "AED" || currencyCode === "SAR") {
    roundedAmount = Math.round(rawConverted * 2) / 2; // nearest .50
    formattedString = `${config.code} ${roundedAmount.toFixed(2)}`;
  } else {
    roundedAmount = Math.round(rawConverted * 100) / 100;
    formattedString = `${config.symbol}${roundedAmount.toFixed(2)}`;
  }

  return {
    formatted: formattedString,
    amount: roundedAmount,
    symbol: config.symbol,
    currency: currencyCode,
  };
}

/**
 * Server-side helper to read visitor country from request headers
 */
export function getCountryFromHeaders(headers: { get(name: string): string | null }): string {
  const vercelCountry = headers.get("x-vercel-ip-country");
  if (vercelCountry) return vercelCountry.toUpperCase();

  const cfCountry = headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX") return cfCountry.toUpperCase();

  return "US";
}
