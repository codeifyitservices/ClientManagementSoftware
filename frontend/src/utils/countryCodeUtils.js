// Country Code Utilities with Live REST Countries API & Instant Fallback Cache

export const FALLBACK_COUNTRIES = [
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳" },
  { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪" },
  { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪" },
  { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", flag: "🇸🇦" },
  { name: "Qatar", code: "QA", dialCode: "+974", flag: "🇶🇦" },
  { name: "Kuwait", code: "KW", dialCode: "+965", flag: "🇰🇼" },
  { name: "Bahrain", code: "BH", dialCode: "+973", flag: "🇧🇭" },
  { name: "Oman", code: "OM", dialCode: "+968", flag: "🇴🇲" },
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷" },
  { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱" },
  { name: "Switzerland", code: "CH", dialCode: "+41", flag: "🇨🇭" },
  { name: "Italy", code: "IT", dialCode: "+39", flag: "🇮🇹" },
  { name: "Spain", code: "ES", dialCode: "+34", flag: "🇪🇸" },
  { name: "China", code: "CN", dialCode: "+86", flag: "🇨🇳" },
  { name: "Japan", code: "JP", dialCode: "+81", flag: "🇯🇵" },
  { name: "South Korea", code: "KR", dialCode: "+82", flag: "🇰🇷" },
  { name: "Indonesia", code: "ID", dialCode: "+62", flag: "🇮🇩" },
  { name: "Malaysia", code: "MY", dialCode: "+60", flag: "🇲🇾" },
  { name: "Philippines", code: "PH", dialCode: "+63", flag: "🇵🇭" },
  { name: "Vietnam", code: "VN", dialCode: "+84", flag: "🇻🇳" },
  { name: "Thailand", code: "TH", dialCode: "+66", flag: "🇹🇭" },
  { name: "New Zealand", code: "NZ", dialCode: "+64", flag: "🇳🇿" },
  { name: "South Africa", code: "ZA", dialCode: "+27", flag: "🇿🇦" },
  { name: "Brazil", code: "BR", dialCode: "+55", flag: "🇧🇷" },
  { name: "Mexico", code: "MX", dialCode: "+52", flag: "🇲🇽" },
  { name: "Ireland", code: "IE", dialCode: "+353", flag: "🇮🇪" },
  { name: "Sweden", code: "SE", dialCode: "+46", flag: "🇸🇪" },
  { name: "Norway", code: "NO", dialCode: "+47", flag: "🇳🇴" },
  { name: "Denmark", code: "DK", dialCode: "+45", flag: "🇩🇰" },
  { name: "Finland", code: "FI", dialCode: "+358", flag: "🇫🇮" },
  { name: "Poland", code: "PL", dialCode: "+48", flag: "🇵🇱" },
  { name: "Austria", code: "AT", dialCode: "+43", flag: "🇦🇹" },
  { name: "Belgium", code: "BE", dialCode: "+32", flag: "🇧🇪" },
  { name: "Portugal", code: "PT", dialCode: "+351", flag: "🇵🇹" },
  { name: "Greece", code: "GR", dialCode: "+30", flag: "🇬🇷" },
  { name: "Turkey", code: "TR", dialCode: "+90", flag: "🇹🇷" },
  { name: "Israel", code: "IL", dialCode: "+972", flag: "🇮🇱" },
  { name: "Egypt", code: "EG", dialCode: "+20", flag: "🇪🇬" },
  { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬" },
  { name: "Kenya", code: "KE", dialCode: "+254", flag: "🇰🇪" },
  { name: "Bangladesh", code: "BD", dialCode: "+880", flag: "🇧🇩" },
  { name: "Pakistan", code: "PK", dialCode: "+92", flag: "🇵🇰" },
  { name: "Sri Lanka", code: "LK", dialCode: "+94", flag: "🇱🇰" },
  { name: "Nepal", code: "NP", dialCode: "+977", flag: "🇳🇵" },
];

let cachedCountryList = [...FALLBACK_COUNTRIES];
let isFetched = false;

/**
 * Fetch full country list from the free REST Countries API
 */
export const fetchLiveCountryCodes = async () => {
  if (isFetched && cachedCountryList.length > FALLBACK_COUNTRIES.length) {
    return cachedCountryList;
  }

  // Try local storage first
  try {
    const stored = localStorage.getItem("crm_country_codes");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedCountryList = parsed;
        isFetched = true;
      }
    }
  } catch (e) {}

  try {
    const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const formatted = [];
        data.forEach((c) => {
          const root = c.idd?.root;
          if (!root) return;
          const suffixes = c.idd?.suffixes || [];
          const dialCode = suffixes.length === 1 ? `${root}${suffixes[0]}` : root;
          if (!dialCode || dialCode.trim() === "") return;

          formatted.push({
            name: c.name?.common || c.name?.official || c.cca2,
            code: c.cca2,
            dialCode: dialCode.startsWith("+") ? dialCode : `+${dialCode}`,
            flag: c.flag || "🌐",
          });
        });

        // Sort alphabetically by name, but keep India & US at the top
        formatted.sort((a, b) => {
          if (a.code === "IN") return -1;
          if (b.code === "IN") return 1;
          if (a.code === "US") return -1;
          if (b.code === "US") return 1;
          return a.name.localeCompare(b.name);
        });

        if (formatted.length > 0) {
          cachedCountryList = formatted;
          isFetched = true;
          try {
            localStorage.setItem("crm_country_codes", JSON.stringify(formatted));
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch live country codes, using fallback:", err.message);
  }

  return cachedCountryList;
};

// Initiate background fetch
fetchLiveCountryCodes();

/**
 * Get country list synchronously (either live cached or fallback)
 */
export const getCountriesList = () => cachedCountryList;

/**
 * Parses any phone string into { dialCode, number }
 * Supports formats like "+91 9876543210", "+1 (555) 123-4567", "9876543210"
 */
export const parsePhoneNumber = (phoneStr) => {
  if (!phoneStr || typeof phoneStr !== "string") {
    return { dialCode: "+91", number: "" };
  }

  const clean = phoneStr.trim();
  if (!clean.startsWith("+")) {
    return { dialCode: "+91", number: clean };
  }

  // Find longest matching dial code
  const sorted = [...cachedCountryList].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  for (const c of sorted) {
    if (clean.startsWith(c.dialCode)) {
      const rest = clean.slice(c.dialCode.length).trim();
      return { dialCode: c.dialCode, number: rest };
    }
  }

  // Default regex fallback if not in list
  const match = clean.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    return { dialCode: match[1], number: match[2] };
  }

  return { dialCode: "+91", number: clean };
};

/**
 * Combines dial code and local number
 */
export const formatFullPhoneNumber = (dialCode, number) => {
  if (!number || !String(number).trim()) return "";
  const code = dialCode ? String(dialCode).trim() : "+91";
  return `${code} ${String(number).trim()}`;
};
