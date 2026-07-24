import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  FileText,
  Download,
  Send,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

// Helper function to convert numeric value into Indian English word format
const numberToWords = (num) => {
  if (num === 0) return "Zero Only";

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const g = ["", "Thousand", "Lakh", "Crore"];

  const makeGroup = (n) => {
    let s = "";
    if (n >= 100) {
      s += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      s += b[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      s += a[n] + " ";
    }
    return s.trim();
  };

  let cleanNum = Math.floor(num);
  let words = "";

  if (cleanNum === 0) return "Zero Rupees Only";

  let initialGroup = cleanNum % 1000;
  if (initialGroup > 0) {
    words = makeGroup(initialGroup) + " " + words;
  }
  cleanNum = Math.floor(cleanNum / 1000);

  if (cleanNum > 0) {
    let group = cleanNum % 100;
    if (group > 0) {
      words = makeGroup(group) + " Thousand " + words;
    }
    cleanNum = Math.floor(cleanNum / 100);
  }

  if (cleanNum > 0) {
    let group = cleanNum % 100;
    if (group > 0) {
      words = makeGroup(group) + " Lakh " + words;
    }
    cleanNum = Math.floor(cleanNum / 100);
  }

  if (cleanNum > 0) {
    words = makeGroup(cleanNum) + " Crore " + words;
  }

  return (words.trim() + " Rupees Only").replace(/\s+/g, " ");
};

export default function InvoicePreviewPage({
  clients = [],
  onSend,
  isSaving = false,
  token,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // Data passed from InvoiceFormPage via navigate("/invoices/preview", { state })
  const invoiceData = location.state?.invoiceData || {};
  const isDummyPreview = !!location.state?.isDummyPreview;
  const returnTo = location.state?.returnTo || "/invoices/create";
  // clients list also available from App but we can fall back from state if needed
  const stateClients = location.state?.clients || clients;
  // Company configurations state (matching dynamic layout parameters)
  const [config, setConfig] = useState({
    companyName: "Codenap IT Services",
    companyEmail: "info@codenap.in",
    companyPhone: "+91 97175 70933",
    companyAddress: "SCO 123, Sector 15, Faridabad, Haryana - 121007",
    companyGst: "06AABCT1234Q1Z5",
    invoiceTerms: "Thank you for your business!",
    companyLogo: "",
  });

  // Load layout configurations
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/clients/config`,
          {
            headers: {
              Authorization: `Bearer ${token || localStorage.getItem("token")}`,
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setConfig({
            companyName: data.companyName || "Codenap IT Services",
            companyEmail: data.companyEmail || "info@codenap.in",
            companyPhone: data.companyPhone || "+91 97175 70933",
            companyAddress:
              data.companyAddress ||
              "SCO 123, Sector 15, Faridabad, Haryana - 121007",
            companyGst: data.companyGst || "06AABCT1234Q1Z5",
            companyWebsite: data.companyWebsite || "www.codenap.co.in",
            invoiceTerms: data.invoiceTerms || "Thank you for your business!",
            companyLogo: data.companyLogo || "",
          });
        }
      } catch (err) {
        // use fallback defaults
      }
    };
    fetchConfig();
  }, [token]);

  // Dynamic invoice number resolution
  const [fetchedInvNumber, setFetchedInvNumber] = useState("");

  useEffect(() => {
    if (
      !invoiceData.invoiceNumber ||
      invoiceData.invoiceNumber === "INV-NEW" ||
      invoiceData.invoiceNumber === "INV-2024-XXXX"
    ) {
      const fetchNextNum = async () => {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/invoices/next-number`,
            {
              headers: {
                Authorization: `Bearer ${token || localStorage.getItem("token")}`,
              },
            },
          );
          if (res.ok) {
            const data = await res.json();
            if (data.invoiceNumber) setFetchedInvNumber(data.invoiceNumber);
          }
        } catch (err) {}
      };
      fetchNextNum();
    }
  }, [invoiceData.invoiceNumber, token]);

  const displayInvoiceNum =
    invoiceData.invoiceNumber &&
    invoiceData.invoiceNumber !== "INV-NEW" &&
    invoiceData.invoiceNumber !== "INV-2024-XXXX"
      ? invoiceData.invoiceNumber
      : fetchedInvNumber || "CN26070010";

  // Selected client details
  const clientId =
    typeof invoiceData.client === "object"
      ? invoiceData.client?._id
      : invoiceData.client;
  const activeClient =
    clients.find((c) => c._id === clientId) ||
    stateClients.find((c) => c._id === clientId) ||
    (typeof invoiceData.client === "object" ? invoiceData.client : {});

  // Auto-detect Place of Supply (Intrastate vs. Interstate)
  const detectStateCode = (c) => {
    if (!c) return "";
    if (
      c.gstNumber &&
      typeof c.gstNumber === "string" &&
      /^\d{2}/.test(c.gstNumber.trim())
    ) {
      return c.gstNumber.trim().slice(0, 2);
    }
    const text = `${c.address || ""} ${c.city || ""}`.toLowerCase();
    if (
      text.includes("west bengal") ||
      text.includes("kolkata") ||
      text.includes("calcutta") ||
      text.includes("wb")
    )
      return "19";
    if (
      text.includes("maharashtra") ||
      text.includes("mumbai") ||
      text.includes("pune") ||
      text.includes("nagpur") ||
      text.includes("mh")
    )
      return "27";
    if (
      text.includes("delhi") ||
      text.includes("new delhi") ||
      text.includes("ncr")
    )
      return "07";
    if (
      text.includes("karnataka") ||
      text.includes("bengaluru") ||
      text.includes("bangalore") ||
      text.includes("ka")
    )
      return "29";
    if (
      text.includes("tamil nadu") ||
      text.includes("chennai") ||
      text.includes("tn")
    )
      return "33";
    if (
      text.includes("telangana") ||
      text.includes("hyderabad") ||
      text.includes("ts")
    )
      return "36";
    if (
      text.includes("gujarat") ||
      text.includes("ahmedabad") ||
      text.includes("surat") ||
      text.includes("gj")
    )
      return "24";
    if (
      text.includes("uttar pradesh") ||
      text.includes("noida") ||
      text.includes("lucknow") ||
      text.includes("kanpur") ||
      text.includes("up")
    )
      return "09";
    if (
      text.includes("punjab") ||
      text.includes("chandigarh") ||
      text.includes("ludhiana") ||
      text.includes("pb")
    )
      return "03";
    if (
      text.includes("rajasthan") ||
      text.includes("jaipur") ||
      text.includes("rj")
    )
      return "08";
    if (
      text.includes("haryana") ||
      text.includes("gurgaon") ||
      text.includes("gurugram") ||
      text.includes("faridabad") ||
      text.includes("hr")
    )
      return "06";
    if (
      text.includes("uttarakhand") ||
      text.includes("dehradun") ||
      text.includes("uk")
    )
      return "05";
    if (
      text.includes("kerala") ||
      text.includes("kochi") ||
      text.includes("cochin") ||
      text.includes("trivandrum") ||
      text.includes("kl")
    )
      return "32";
    if (
      text.includes("madhya pradesh") ||
      text.includes("bhopal") ||
      text.includes("indore") ||
      text.includes("mp")
    )
      return "23";
    if (text.includes("bihar") || text.includes("patna") || text.includes("br"))
      return "10";
    if (
      text.includes("jharkhand") ||
      text.includes("ranchi") ||
      text.includes("jh")
    )
      return "20";
    if (
      text.includes("odisha") ||
      text.includes("orissa") ||
      text.includes("bhubaneswar") ||
      text.includes("or")
    )
      return "21";
    if (
      text.includes("chhattisgarh") ||
      text.includes("raipur") ||
      text.includes("cg")
    )
      return "22";
    if (
      text.includes("assam") ||
      text.includes("guwahati") ||
      text.includes("as")
    )
      return "18";
    if (text.includes("goa") || text.includes("panaji")) return "30";
    if (
      text.includes("jammu") ||
      text.includes("srinagar") ||
      text.includes("j&k")
    )
      return "01";
    if (text.includes("himachal") || text.includes("shimla")) return "02";
    return "";
  };

  const companyStateCode = config.companyGst
    ? config.companyGst.slice(0, 2)
    : "06";
  const clientStateCode = detectStateCode(activeClient);
  const isInterstate = !!(
    clientStateCode && companyStateCode !== clientStateCode
  );

  // Tax calculations
  const items = invoiceData.items || [];
  let subTotal = 0;
  let totalGstAmount = 0;
  items.forEach((item) => {
    const base = item.qty * item.rate;
    subTotal += base;
    totalGstAmount += base * (item.gstRate / 100);
  });
  const grandTotal = subTotal + totalGstAmount;

  // Get active item GST rate for informational text
  const primaryGstRate = items[0]?.gstRate || 18;

  const handleBack = () => {
    if (isDummyPreview) {
      navigate("/invoices");
      return;
    }
    navigate(returnTo, {
      state: {
        draftInvoice: invoiceData,
        clients: stateClients,
      },
    });
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in max-w-4xl mx-auto select-none">
      {/* Header Block matching mockup */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold text-slate-950 flex items-center gap-1.5">
            <button
              onClick={handleBack}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Invoice Preview</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5 ml-7">
            {isDummyPreview
              ? "Preview the invoice layout with sample data. Nothing will be saved."
              : "Preview your tax invoice before sending it to the client."}
          </p>
        </div>
        <span className="text-[10px] font-bold text-slate-400 select-none">
          Invoices &nbsp;&gt;&nbsp; Invoice Preview
        </span>
      </div>

      {/* Standalone A4 Invoice Paper Sheet */}
      <div className="invoice-a4-sheet bg-white rounded-2xl border border-slate-200 custom-shadow p-12 select-none text-black text-xs leading-relaxed max-w-full mx-auto box-border flex flex-col justify-between min-h-[1100px]">
        <div className="space-y-6">
          {/* 1. Header Row (From details LEFT, INVOICE title RIGHT) */}
          <div className="flex items-start justify-between pb-6 border-b border-slate-200">
            {/* Left: Company Logo & Details ("From") */}
            <div className="space-y-1.5">
              {config.companyLogo ? (
                <img
                  src={`${import.meta.env.VITE_BACKEND_URL}/uploads/${config.companyLogo}`}
                  alt="Logo"
                  className="h-12 w-auto object-contain rounded mb-2"
                />
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                    {config.companyName.charAt(0)}
                  </div>
                </div>
              )}
              <span className="text-[10px] font-bold text-black uppercase tracking-wider block mb-1">
                FROM
              </span>
              <h2 className="text-xs font-black uppercase text-black tracking-wide leading-snug">
                {config.companyName}
              </h2>
              <p className="text-[10px] text-black font-semibold max-w-[280px] leading-relaxed">
                {config.companyAddress}
              </p>
              {config.companyGst && (
                <p className="text-[10px] text-black font-bold">
                  GSTIN {config.companyGst}
                </p>
              )}
            </div>

            {/* Right: INVOICE Title */}
            <div className="text-right">
              <h1 className="text-xl font-black tracking-tight text-black uppercase">
                TAX INVOICE
              </h1>
            </div>
          </div>

          {/* 2. Bill To (Client) & Invoice Metadata Split */}
          <div className="grid grid-cols-2 gap-6 pt-2">
            {/* Left: Bill To */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-black uppercase tracking-wider block mb-1">
                BILL TO
              </span>
              <h3 className="text-xs font-black text-black uppercase tracking-wide">
                {activeClient.companyName ||
                  activeClient.clientName ||
                  "Client Company Name"}
              </h3>
              {activeClient.clientName && activeClient.companyName && (
                <p className="text-[10px] text-black font-bold">
                  {activeClient.clientName}
                </p>
              )}
              <p className="text-[10px] text-black font-semibold max-w-[260px] leading-relaxed">
                {activeClient.address || "Client Address"}
                {activeClient.city ? `, ${activeClient.city}` : ""}
                {activeClient.pincode ? ` - ${activeClient.pincode}` : ""}
              </p>
              {activeClient.gstNumber && (
                <p className="text-[10px] text-black font-bold">
                  GSTIN: {activeClient.gstNumber}
                </p>
              )}
            </div>

            {/* Right: Invoice Metadata */}
            <div className="text-right flex flex-col justify-end items-end">
              <table className="text-[10px]">
                <tbody>
                  <tr>
                    <td className="text-black font-bold pr-3 py-1 text-right">
                      Invoice No :
                    </td>
                    <td className="text-black font-black py-1 font-mono">
                      {displayInvoiceNum}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-black font-bold pr-3 py-1 text-right">
                      Invoice Date :
                    </td>
                    <td className="text-black font-black py-1">
                      {new Date(
                        invoiceData.invoiceDate || Date.now(),
                      ).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-black font-bold pr-3 py-1 text-right">
                      Status :
                    </td>
                    <td className="py-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                          (invoiceData.paymentStatus || "").toLowerCase() ===
                          "paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-amber-50 text-amber-800 border-amber-300"
                        }`}
                      >
                        {invoiceData.paymentStatus || "Pending"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Table of items */}
          <table className="w-full text-left border-collapse text-[10px] mt-4">
            <thead>
              <tr className="bg-slate-100 text-black font-black">
                <th className="py-2.5 px-3 rounded-l w-8">#</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-center">SAC Code</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 text-right rounded-r">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-bold text-black">
              {items.map((item, idx) => {
                const lineTaxable = item.qty * item.rate;
                return (
                  <tr key={idx}>
                    <td className="py-3 px-3 text-black font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 text-black font-bold">
                      {item.description || "Website Development"}
                    </td>
                    <td className="py-3 px-3 text-center text-black font-bold">
                      {item.sacCode || "998314"}
                    </td>
                    <td className="py-3 px-3 text-center text-black font-bold">
                      {item.qty}
                    </td>
                    <td className="py-3 px-3 text-right text-black font-bold">
                      {item.rate.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 text-right text-black font-black">
                      {lineTaxable.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 5. Totals Breakdown */}
          <div className="border-t border-slate-200 pt-3 flex flex-col items-end gap-1.5">
            <div className="w-64 grid grid-cols-2 text-right text-[10px] font-bold text-black">
              <span>Sub Total</span>
              <span className="text-black font-extrabold">
                ₹
                {subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>

              {isInterstate ? (
                <>
                  <span>IGST ({primaryGstRate}%)</span>
                  <span className="text-black font-extrabold">
                    ₹
                    {totalGstAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    CGST ({(primaryGstRate / 2).toFixed(1).replace(/\.0$/, "")}
                    %)
                  </span>
                  <span className="text-black font-extrabold">
                    ₹
                    {(totalGstAmount / 2).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span>
                    SGST ({(primaryGstRate / 2).toFixed(1).replace(/\.0$/, "")}
                    %)
                  </span>
                  <span className="text-black font-extrabold">
                    ₹
                    {(totalGstAmount / 2).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </>
              )}
            </div>
            <div className="w-64 border-t border-slate-300 pt-2 grid grid-cols-2 text-right text-xs">
              <span className="font-black text-black">Grand Total</span>
              <span className="font-black text-black">
                ₹
                {grandTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* 6. Amount in words & footer footnotes */}
          <div className="pt-10 border-t border-slate-200">
            <p className="text-[10px] font-black text-black">
              Amount in Words:{" "}
              <span className="text-black font-normal">
                {numberToWords(grandTotal)}
              </span>
            </p>
            <p className="text-[10px] font-semibold text-black mt-2 italic">
              {config.invoiceTerms}
            </p>
          </div>
        </div>

        {/* 7. Footer Contact details pinned to bottom of A4 sheet */}
        <div className="mt-auto pt-6 border-t border-slate-200 flex items-center justify-between text-[9px] font-black text-black">
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-black" />
            <span>{config.companyPhone}</span>
          </span>
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-black" />
            <span>{config.companyEmail}</span>
          </span>
          {config.companyWebsite && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3 text-black" />
              <span>{config.companyWebsite}</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions Footer */}
      <div className="flex items-center justify-center gap-3 pt-6">
        <button
          type="button"
          onClick={handleBack}
          className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-650 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          {isDummyPreview ? "Back to Invoices" : "Back to Edit"}
        </button>
        <button
          type="button"
          onClick={() => {
            alert(
              isDummyPreview
                ? "Dummy preview is not saved, so a PDF cannot be downloaded."
                : "Please save and send the invoice first to download PDF.",
            );
          }}
          className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Download className="h-4 w-4" />
          <span>Download PDF</span>
        </button>
        {!isDummyPreview && (
          <button
            type="button"
            onClick={() => onSend({ ...invoiceData, shouldSendEmail: false })}
            disabled={isSaving}
            className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span>Save Invoice</span>
          </button>
        )}
      </div>
    </div>
  );
}
