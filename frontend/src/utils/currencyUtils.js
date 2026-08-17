// Currency Utility Module with Free Live Exchange Rate API support

export const SUPPORTED_CURRENCIES = [
  { code: "INR", label: "INR (₹)", symbol: "₹" },
  { code: "AED", label: "AED (AED)", symbol: "AED" },
  { code: "USD", label: "USD ($)", symbol: "$" },
  { code: "GBP", label: "GBP (£)", symbol: "£" },
  { code: "EUR", label: "EUR (€)", symbol: "€" },
  { code: "AUD", label: "AUD (A$)", symbol: "A$" },
];

// Fallback rates relative to 1 INR if API is offline
const FALLBACK_RATES_FROM_INR = {
  INR: 1,
  USD: 0.0116,  // ~86.5 INR per USD
  AED: 0.0426,  // ~23.5 INR per AED
  GBP: 0.0092,  // ~108.5 INR per GBP
  EUR: 0.0108,  // ~92.5 INR per EUR
  AUD: 0.0178,  // ~56.0 INR per AUD
};

let cachedRates = { ...FALLBACK_RATES_FROM_INR };
let lastFetchTime = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache

/**
 * Fetch live exchange rates relative to INR from free API
 */
export const fetchLiveRates = async () => {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_DURATION_MS && lastFetchTime > 0) {
    return cachedRates;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/INR");
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        cachedRates = {
          INR: 1,
          USD: data.rates.USD || FALLBACK_RATES_FROM_INR.USD,
          AED: data.rates.AED || FALLBACK_RATES_FROM_INR.AED,
          GBP: data.rates.GBP || FALLBACK_RATES_FROM_INR.GBP,
          EUR: data.rates.EUR || FALLBACK_RATES_FROM_INR.EUR,
          AUD: data.rates.AUD || FALLBACK_RATES_FROM_INR.AUD,
        };
        lastFetchTime = now;
        try {
          localStorage.setItem("crm_exchange_rates", JSON.stringify({ rates: cachedRates, time: now }));
        } catch (e) {}
        return cachedRates;
      }
    }
  } catch (err) {
    console.warn("Could not fetch live exchange rates, using cached/fallback rates:", err.message);
  }

  // Try loading from localStorage
  try {
    const stored = localStorage.getItem("crm_exchange_rates");
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
 * Convert an amount in a foreign currency to INR
 */
export const convertToINR = (amount, currencyStr) => {
  const numericAmount = Number(amount) || 0;
  if (!numericAmount) return 0;
  const code = getCurrencyCode(currencyStr);
  if (code === "INR") return numericAmount;

  const rateFromINR = cachedRates[code] || FALLBACK_RATES_FROM_INR[code] || 1;
  // If 1 INR = rateFromINR units of foreign currency, then 1 foreign currency = (1 / rateFromINR) INR
  const inrValue = numericAmount / rateFromINR;
  return Math.round(inrValue * 100) / 100;
};

/**
 * Format currency strictly in its own currency (e.g. "$1,000.00" or "AED 1,000.00")
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
 * Format currency with converted INR display for system UI (e.g. "$1,000 (~₹86,500)")
 */
export const formatWithINRConversion = (amount, currencyStr) => {
  const numericAmount = Number(amount) || 0;
  const code = getCurrencyCode(currencyStr);
  const primary = formatCurrencyOnly(numericAmount, currencyStr);

  if (code === "INR") {
    return primary;
  }

  const inrVal = convertToINR(numericAmount, currencyStr);
  const formattedINR = inrVal.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
  return `${primary} (~₹${formattedINR})`;
};
