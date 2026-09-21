// Currency Utility Module with Free Live Exchange Rate API support

export const SUPPORTED_CURRENCIES = [
  { code: "INR", label: "INR (₹)", symbol: "₹" },
  { code: "AED", label: "AED (د.إ)", symbol: "د.إ" },
  { code: "USD", label: "USD ($)", symbol: "$" },
  { code: "GBP", label: "GBP (£)", symbol: "£" },
  { code: "EUR", label: "EUR (€)", symbol: "€" },
  { code: "AUD", label: "AUD (A$)", symbol: "A$" },
];

// Fallback rates (INR per 1 unit of foreign currency) if API is offline
const FALLBACK_INR_RATES = {
  INR: 1,
  USD: 96.03698, // Current rate: 1 USD = 96.03698 INR
  AED: 26.1503,  // ~26.15 INR per AED
  EUR: 110.2232, // ~110.22 INR per EUR
  GBP: 128.4928, // ~128.49 INR per GBP
  AUD: 68.3734,  // ~68.37 INR per AUD
};

let cachedRates = { ...FALLBACK_INR_RATES };
let lastFetchTime = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache

/**
 * Fetch live exchange rates from https://open.er-api.com/v6/latest/USD
 */
export const fetchLiveRates = async () => {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_DURATION_MS && lastFetchTime > 0) {
    return cachedRates;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && data.rates.INR) {
        const inrPerUsd = Number(data.rates.INR);
        cachedRates = {
          INR: 1,
          USD: inrPerUsd,
          AED: inrPerUsd / (Number(data.rates.AED) || 3.6725),
          EUR: inrPerUsd / (Number(data.rates.EUR) || 0.871295),
          GBP: inrPerUsd / (Number(data.rates.GBP) || 0.747411),
          AUD: inrPerUsd / (Number(data.rates.AUD) || 1.404595),
        };
        lastFetchTime = now;
        try {
          localStorage.setItem(
            "crm_exchange_rates_usd",
            JSON.stringify({ rates: cachedRates, time: now }),
          );
        } catch (e) {}
        return cachedRates;
      }
    }
  } catch (err) {
    console.warn(
      "Could not fetch live exchange rates from open.er-api.com/v6/latest/USD, using cached/fallback:",
      err.message,
    );
  }

  // Try loading from localStorage
  try {
    const stored = localStorage.getItem("crm_exchange_rates_usd");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.rates) {
        cachedRates = parsed.rates;
        return cachedRates;
      }
    }
  } catch (e) {}

  return cachedRates;
};

// Fire off background fetch on import
fetchLiveRates();

/**
 * Extract 3-letter currency code (e.g. "USD ($)" -> "USD")
 */
export const getCurrencyCode = (currencyStr) => {
  if (!currencyStr) return "INR";
  const str = String(currencyStr).trim().toUpperCase();
  if (str.includes("USD")) return "USD";
  if (str.includes("AED")) return "AED";
  if (str.includes("GBP")) return "GBP";
  if (str.includes("EUR")) return "EUR";
  if (str.includes("AUD") || str.includes("A$")) return "AUD";
  return "INR";
};

/**
 * Get currency symbol (e.g. "USD ($)" -> "$")
 */
export const getCurrencySymbol = (currencyStr) => {
  const code = getCurrencyCode(currencyStr);
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return found ? found.symbol : "₹";
};

/**
 * Get the live exchange rate (INR per 1 unit of foreign currency)
 */
export const getLiveExchangeRate = (currencyStr) => {
  const code = getCurrencyCode(currencyStr);
  return cachedRates[code] || FALLBACK_INR_RATES[code] || 1;
};

/**
 * Convert an amount in a foreign currency to INR
 */
export const convertToINR = (amount, currencyStr) => {
  const numericAmount = Number(amount) || 0;
  if (!numericAmount) return 0;
  const code = getCurrencyCode(currencyStr);
  if (code === "INR") return numericAmount;

  const rateToINR = cachedRates[code] || FALLBACK_INR_RATES[code] || 1;
  const inrValue = numericAmount * rateToINR;
  return Math.round(inrValue * 100) / 100;
};

/**
 * Convert an amount from one currency to another currency
 */
export const convertCurrency = (amount, fromCurrency, toCurrency) => {
  const numeric = Number(amount) || 0;
  if (!numeric) return 0;
  const fromCode = getCurrencyCode(fromCurrency);
  const toCode = getCurrencyCode(toCurrency);
  if (fromCode === toCode) return numeric;

  // Convert from origin currency to INR
  const inrValue = convertToINR(numeric, fromCurrency);
  if (toCode === "INR") return inrValue;

  // Convert INR to destination currency
  const destRateToINR = cachedRates[toCode] || FALLBACK_INR_RATES[toCode] || 1;
  const result = inrValue / destRateToINR;
  return Math.round(result * 100) / 100;
};

/**
 * Format currency strictly in its own currency (e.g. "$ 100.00" or "AED 100.00")
 */
export const formatCurrencyOnly = (amount, currencyStr) => {
  const numericAmount = Number(amount) || 0;
  const symbol = getCurrencySymbol(currencyStr);
  const formatted = numericAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
};

/**
 * Format currency with converted INR display (e.g. "$ 100.00 (~₹9,603.70)")
 * ONLY when isPaid === true and amount > 0. Otherwise returns strictly the primary currency.
 */
export const formatWithINRConversion = (amount, currencyStr, isPaid = false) => {
  const numericAmount = Number(amount) || 0;
  const code = getCurrencyCode(currencyStr);
  const primary = formatCurrencyOnly(numericAmount, currencyStr);

  if (code === "INR" || !isPaid || numericAmount <= 0) {
    return primary;
  }

  const inrVal = convertToINR(numericAmount, currencyStr);
  const formattedINR = inrVal.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${primary} (~₹${formattedINR})`;
};

/**
 * Format Subscription ID as SUB-COD-[M/H/D/C]-YYYY
 * M - Maintenance, H - Hosting, D - Digital Marketing, C - Custom
 */
export const getSubscriptionCode = (sub) => {
  if (!sub) return "SUB-COD-C-2026";
  if (sub.subscriptionCode) return sub.subscriptionCode;
  if (sub.customSubscriptionId) return sub.customSubscriptionId;

  let typeCode = "C";
  const typeStr = String(sub.type || "").toLowerCase();
  
  if (typeStr.includes("maintenance")) {
    typeCode = "M";
  } else if (typeStr.includes("hosting")) {
    typeCode = "H";
  } else if (typeStr.includes("digital_marketing") || typeStr.includes("digital")) {
    typeCode = "D";
  } else if (typeStr.includes("custom")) {
    typeCode = "C";
  } else if (typeStr) {
    typeCode = typeStr.charAt(0).toUpperCase();
  }

  const dateObj = sub.startDate
    ? new Date(sub.startDate)
    : sub.createdAt
    ? new Date(sub.createdAt)
    : new Date();
  const year = isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear();

  return `SUB-COD-${typeCode}-${year}`;
};
