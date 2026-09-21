// Live Currency Exchange Rate Service for Backend

const FALLBACK_INR_RATES = {
  INR: 1,
  USD: 96.03698, // Current rate: 1 USD = ~96.04 INR
  AED: 26.1503, // 1 AED = ~26.15 INR
  EUR: 110.2232, // 1 EUR = ~110.22 INR
  GBP: 128.4928, // 1 GBP = ~128.49 INR
  AUD: 68.3734, // 1 AUD = ~68.37 INR
};

let cachedRates = { ...FALLBACK_INR_RATES };
let lastFetchTime = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch live exchange rates from https://open.er-api.com/v6/latest/USD
 */
export const fetchLiveRatesBackend = async () => {
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
        return cachedRates;
      }
    }
  } catch (err) {
    console.warn("Backend: Could not fetch live exchange rates, using fallback:", err.message);
  }

  return cachedRates;
};

// Initial background fetch
fetchLiveRatesBackend().catch(() => {});

/**
 * Extract currency code from string (e.g. "USD ($)" -> "USD")
 */
export const getCurrencyCodeBackend = (currencyStr) => {
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
 * Get exchange rate for 1 foreign unit to INR
 */
export const getRateToINRBackend = async (currencyStr) => {
  const code = getCurrencyCodeBackend(currencyStr);
  if (code === "INR") return 1;
  const rates = await fetchLiveRatesBackend();
  return rates[code] || FALLBACK_INR_RATES[code] || 1;
};

/**
 * Convert foreign amount to INR
 */
export const convertToINRBackend = async (amount, currencyStr) => {
  const numericAmount = Number(amount) || 0;
  if (!numericAmount) return 0;
  const code = getCurrencyCodeBackend(currencyStr);
  if (code === "INR") return numericAmount;
  const rate = await getRateToINRBackend(currencyStr);
  return Math.round(numericAmount * rate * 100) / 100;
};
