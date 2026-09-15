import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import {
  getCountriesList,
  fetchLiveCountryCodes,
  parsePhoneNumber,
  formatFullPhoneNumber,
} from "../utils/countryCodeUtils";

export default function PhoneInputWithCountry({
  value = "",
  onChange,
  placeholder = "98765 43210",
  disabled = false,
  readOnly = false,
  hasError = false,
  className = "",
  inputClassName = "",
  id,
  name,
  required = false,
}) {
  const [countries, setCountries] = useState(getCountriesList());
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownCoords, setDropdownCoords] = useState({
    top: 0,
    left: 0,
    width: 280,
    placement: "bottom",
  });

  const triggerButtonRef = useRef(null);
  const popupRef = useRef(null);
  const searchInputRef = useRef(null);

  // Parse initial or incoming value
  const { dialCode: initialDialCode, number: initialNumber } = parsePhoneNumber(value);
  const [selectedDialCode, setSelectedDialCode] = useState(initialDialCode || "+91");
  const [phoneNumber, setPhoneNumber] = useState(initialNumber || "");

  // Update country list if async API completes
  useEffect(() => {
    fetchLiveCountryCodes().then((list) => {
      if (list && list.length > 0) {
        setCountries(list);
      }
    });
  }, []);

  // Sync state if external value changes
  useEffect(() => {
    const parsed = parsePhoneNumber(value);
    setSelectedDialCode(parsed.dialCode || "+91");
    setPhoneNumber(parsed.number || "");
  }, [value]);

  const updatePosition = () => {
    if (!triggerButtonRef.current) return;
    const rect = triggerButtonRef.current.getBoundingClientRect();
    const dropdownHeight = 250;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setDropdownCoords({
      top: openUpward ? Math.max(10, rect.top - dropdownHeight - 6) : rect.bottom + 6,
      left: Math.max(10, Math.min(rect.left, window.innerWidth - 290)),
      width: 280,
      placement: openUpward ? "top" : "bottom",
    });
  };

  const handleToggle = () => {
    if (disabled || readOnly) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  // Reposition on window resize or scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      updatePosition();
    };
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (
        triggerButtonRef.current &&
        triggerButtonRef.current.contains(e.target)
      ) {
        return;
      }
      if (popupRef.current && popupRef.current.contains(e.target)) {
        return;
      }
      setIsOpen(false);
      setSearchQuery("");
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  const selectedCountry =
    countries.find((c) => c.dialCode === selectedDialCode) ||
    countries.find((c) => c.code === "IN") || {
      name: "India",
      code: "IN",
      dialCode: "+91",
      flag: "🇮🇳",
    };

  const filteredCountries = countries.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  const handleDialCodeSelect = (dialCode) => {
    setSelectedDialCode(dialCode);
    setIsOpen(false);
    setSearchQuery("");
    if (onChange) {
      const full = formatFullPhoneNumber(dialCode, phoneNumber);
      onChange(full);
    }
  };

  const handleNumberChange = (e) => {
    const rawVal = e.target.value;
    // Allow digits, spaces, dashes
    const cleaned = rawVal.replace(/[^\d\s-()]/g, "");
    setPhoneNumber(cleaned);
    if (onChange) {
      const full = formatFullPhoneNumber(selectedDialCode, cleaned);
      onChange(full);
    }
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      {/* Outer Input Container */}
      <div
        className={`flex items-stretch w-full rounded-xl border transition-all ${
          hasError
            ? "border-red-500 ring-2 ring-red-500/10 bg-red-50/10"
            : "border-slate-200 focus-within:border-[#5D5FEF] focus-within:ring-2 focus-within:ring-[#5D5FEF]/15 bg-white"
        } ${disabled || readOnly ? "opacity-75 bg-slate-50 cursor-not-allowed" : ""}`}
      >
        {/* Country Code Dropdown Trigger */}
        <button
          ref={triggerButtonRef}
          type="button"
          disabled={disabled || readOnly}
          onClick={handleToggle}
          className={`h-full flex items-center gap-1.5 px-3 py-2 border-r border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-l-xl transition-colors select-none ${
            disabled || readOnly ? "cursor-not-allowed hover:bg-slate-50/70" : "cursor-pointer"
          }`}
          title={`${selectedCountry.name} (${selectedCountry.dialCode})`}
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="text-[11px] font-extrabold text-slate-800">
            {selectedCountry.dialCode}
          </span>
          <ChevronDown
            className={`h-3 w-3 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Local Number Input */}
        <div className="relative flex-1 flex items-center">
          <input
            id={id}
            name={name}
            type="tel"
            value={phoneNumber}
            onChange={handleNumberChange}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            className={`w-full h-full px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-350 focus:outline-none rounded-r-xl bg-transparent ${inputClassName}`}
          />
        </div>
      </div>

      {/* Floating Portal Dropdown (never clipped by modal overflow) */}
      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              top: `${dropdownCoords.top}px`,
              left: `${dropdownCoords.left}px`,
              width: `${dropdownCoords.width}px`,
              zIndex: 999999,
            }}
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 select-none"
          >
            {/* Search Header */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/70 sticky top-0">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search country or code..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Countries List */}
            <div className="overflow-y-auto flex-1 p-1 space-y-0.5 max-h-48 text-xs font-semibold">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c) => {
                  const isSelected = c.dialCode === selectedDialCode;
                  return (
                    <button
                      key={`${c.code}-${c.dialCode}`}
                      type="button"
                      onClick={() => handleDialCodeSelect(c.dialCode)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 text-indigo-700 font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm shrink-0">{c.flag}</span>
                        <span className="truncate text-xs">{c.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-2 font-bold">
                        {c.dialCode}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No countries found
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
