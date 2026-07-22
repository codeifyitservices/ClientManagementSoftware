import React, { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, Eye, ChevronLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

// State lookup helper for state name from GSTIN code
const stateLookup = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  10: "Bihar",
  11: "Sikkim",
  12: "Arunachal Pradesh",
  13: "Nagaland",
  14: "Manipur",
  15: "Mizoram",
  16: "Tripura",
  17: "Meghalaya",
  18: "Assam",
  19: "West Bengal",
  20: "Jharkhand",
  21: "Odisha",
  22: "Chhattisgarh",
  23: "Madhya Pradesh",
  24: "Gujarat",
  26: "Dadra & Nagar Haveli and Daman & Diu",
  27: "Maharashtra",
  29: "Karnataka",
  30: "Goa",
  31: "Lakshadweep",
  32: "Kerala",
  33: "Tamil Nadu",
  34: "Puducherry",
  35: "Andaman & Nicobar Islands",
  36: "Telangana",
  37: "Andhra Pradesh",
  38: "Ladakh",
};

const getDefaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return date.toISOString().split("T")[0];
};

export default function InvoiceFormPage({
  clients = [],
  onSubmit,
  isSaving = false,
  token,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // Invoice to edit is passed via location state (from InvoiceTable or DashboardView)
  const invoice = location.state?.invoice || null;
  const draftInvoice = location.state?.draftInvoice || null;
  const isEdit = !!invoice;

  // Company and Services configuration states
  const [config, setConfig] = useState({
    companyGst: "06AABCT1234Q1Z5",
  });
  const [backendServices, setBackendServices] = useState([]);

  // Load layout configurations and services list
  useEffect(() => {
    const fetchConfigAndServices = async () => {
      const headers = {
        Authorization: `Bearer ${token || localStorage.getItem("token")}`,
      };

      // Fetch company profile settings
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/clients/config`,
          {
            headers,
          },
        );
        if (res.ok) {
          const data = await res.json();
          setConfig({
            companyGst: data.companyGst || "06AABCT1234Q1Z5",
          });
        }
      } catch (err) {
        // Fallback
      }

      // Fetch pre-configured services settings
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/services`,
          {
            headers,
          },
        );
        if (res.ok) {
          const servicesData = await res.json();
          setBackendServices(servicesData);
        }
      } catch (err) {
        // Fallback
      }
    };

    fetchConfigAndServices();
  }, [token]);

  // Invoice form states
  const [selectedClientId, setSelectedClientId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [invoiceType, setInvoiceType] = useState("Tax Invoice");
  const [currency, setCurrency] = useState("INR (₹)");
  const [notes, setNotes] = useState("");

  // Invoice items list state
  const [items, setItems] = useState([
    { description: "", sacCode: "998314", qty: 1, rate: 0, gstRate: 18 },
  ]);

  // Populate edits if present
  useEffect(() => {
    const sourceInvoice = invoice || draftInvoice;
    if (sourceInvoice) {
      setSelectedClientId(
        sourceInvoice.client?._id || sourceInvoice.client || "",
      );
      setInvoiceDate(
        new Date(sourceInvoice.invoiceDate || sourceInvoice.createdAt)
          .toISOString()
          .split("T")[0],
      );
      setDueDate(
        new Date(sourceInvoice.dueDate || getDefaultDueDate())
          .toISOString()
          .split("T")[0],
      );
      setPaymentStatus(sourceInvoice.paymentStatus || "Pending");
      setInvoiceType(sourceInvoice.invoiceType || "Tax Invoice");
      setCurrency(sourceInvoice.currency || "INR (₹)");
      setNotes(sourceInvoice.notes || "");
      if (sourceInvoice.items && sourceInvoice.items.length > 0) {
        setItems(
          sourceInvoice.items.map((i) => ({
            description: i.description || "",
            sacCode: i.sacCode || "998314",
            qty: i.qty || 1,
            rate: i.rate || 0,
            gstRate: i.gstRate || 18,
          })),
        );
      } else {
        setItems([
          {
            description: sourceInvoice.serviceDescription || "",
            sacCode: sourceInvoice.sacCode || "998314",
            qty: 1,
            rate: sourceInvoice.amount || 0,
            gstRate: sourceInvoice.gstRate || 18,
          },
        ]);
      }
    }
  }, [invoice, draftInvoice]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { description: "", sacCode: "998314", qty: 1, rate: 0, gstRate: 18 },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item };
        if (field === "qty" || field === "rate" || field === "gstRate") {
          updated[field] = Number(value) || 0;
        } else {
          updated[field] = value;
        }
        return updated;
      }),
    );
  };

  const handleServiceSelect = (index, value) => {
    if (!value) return;
    const selected = backendServices.find((s) => s.name === value);
    if (selected) {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                description: selected.name,
                sacCode: selected.sacCode,
                gstRate: selected.gstRate,
              }
            : item,
        ),
      );
    }
  };

  // Selected client object
  const activeClient = clients.find((c) => c._id === selectedClientId) || {};

  // Auto-detect Place of Supply (Intrastate vs. Interstate)
  const companyStateCode = config.companyGst
    ? config.companyGst.slice(0, 2)
    : "06";
  const clientStateCode = activeClient.gstNumber
    ? activeClient.gstNumber.slice(0, 2)
    : "";

  const isInterstate = clientStateCode && companyStateCode !== clientStateCode;
  const clientStateName =
    stateLookup[clientStateCode] || activeClient.city || "Unknown State";

  const placeOfSupplyText = clientStateCode
    ? `${clientStateName} (${clientStateCode}) (${isInterstate ? "Interstate" : "Intrastate"})`
    : "No GSTIN Profile (Intrastate)";

  // Tax calculations
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
  const taxTypeText = clientStateCode
    ? isInterstate
      ? `IGST ${primaryGstRate}%`
      : `CGST ${primaryGstRate / 2}% + SGST ${primaryGstRate / 2}%`
    : `CGST ${primaryGstRate / 2}% + SGST ${primaryGstRate / 2}%`;

  const handleFormSubmit = (statusOverride = null, shouldSendEmail = false) => {
    if (!selectedClientId) {
      alert("Please select a client.");
      return;
    }
    if (!dueDate) {
      alert("Please select a due date.");
      return;
    }
    const emptyDescriptions = items.some((item) => !item.description.trim());
    if (emptyDescriptions) {
      alert("Please enter a description for all items.");
      return;
    }

    const payload = {
      ...(invoice?._id ? { _id: invoice._id } : {}),
      client: selectedClientId,
      invoiceDate,
      dueDate,
      invoiceType,
      currency,
      notes,
      items,
      paymentStatus: statusOverride || paymentStatus,
      shouldSendEmail,
    };

    onSubmit(payload);
  };

  const handlePreviewTrigger = () => {
    if (!selectedClientId) {
      alert("Please select a client to preview.");
      return;
    }
    if (!dueDate) {
      alert("Please select a due date to preview.");
      return;
    }
    const emptyDescriptions = items.some((item) => !item.description.trim());
    if (emptyDescriptions) {
      alert("Please enter a description for all items to preview.");
      return;
    }

    navigate("/invoices/preview", {
      state: {
        invoiceData: {
          client: selectedClientId,
          invoiceDate,
          dueDate,
          invoiceType,
          currency,
          notes,
          items,
          paymentStatus,
          invoiceNumber: invoice?.invoiceNumber || "INV-NEW",
          _id: invoice?._id || null,
        },
        returnTo: isEdit ? `/invoices/${invoice._id}/edit` : "/invoices/create",
      },
    });
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold text-slate-950 flex items-center gap-1.5">
            <button
              onClick={() => navigate("/invoices")}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              {isEdit
                ? `Edit Invoice (${invoice.invoiceNumber})`
                : "Create Invoice"}
            </span>
          </h2>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5 ml-7">
            Configure metadata parameters and specify line-item values below.
          </p>
        </div>
        <span className="text-[10px] font-bold text-slate-400 select-none">
          Invoices &nbsp;&gt;&nbsp; {isEdit ? "Edit Invoice" : "Create Invoice"}
        </span>
      </div>

      {/* VERTICAL STACK LAYOUT */}
      <div className="space-y-6">
        {/* TOP PANEL: Invoice details in a compact grid */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 pb-1 border-b border-slate-50">
            Invoice Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Client Select */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white cursor-pointer"
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName} ({c.clientName})
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Date */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setInvoiceDate(newDate);
                    if (newDate) {
                      const dateObj = new Date(newDate);
                      dateObj.setDate(dateObj.getDate() + 15);
                      setDueDate(dateObj.toISOString().split("T")[0]);
                    }
                  }}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white"
                />
                <Calendar className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white cursor-pointer"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Notes / Comments Row */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Invoice Footnotes / Terms & Conditions
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter specific notes or bank references..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* BOTTOM PANEL: Invoice Items Grid */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow space-y-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 pb-1 border-b border-slate-50">
            Billing Line Items
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 w-8">#</th>
                  <th className="pb-3 w-80">Service / Line Item Description</th>
                  <th className="pb-3 w-28">SAC Code</th>
                  <th className="pb-3 w-16 text-center">Qty</th>
                  <th className="pb-3 w-28 text-right">Rate (₹)</th>
                  <th className="pb-3 w-16 text-center">GST (%)</th>
                  <th className="pb-3 w-32 text-right">Amount (₹)</th>
                  <th className="pb-3 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.map((item, index) => {
                  const lineTaxable = item.qty * item.rate;
                  const lineTotal = lineTaxable * (1 + item.gstRate / 100);

                  return (
                    <tr key={index} className="hover:bg-slate-50/20">
                      <td className="py-4 font-bold text-slate-450">
                        {index + 1}
                      </td>
                      <td className="py-4 pr-3">
                        <div className="space-y-2">
                          {/* Service pre-fill selector */}
                          <select
                            value=""
                            onChange={(e) =>
                              handleServiceSelect(index, e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 bg-slate-50/40 hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">
                              -- Prefill from billing services --
                            </option>
                            {backendServices.map((s) => (
                              <option key={s._id} value={s.name}>
                                {s.name} (SAC {s.sacCode} | GST {s.gstRate}%)
                              </option>
                            ))}
                          </select>

                          {/* Fully editable description input field */}
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Enter description (e.g. Website development - Phase 2)..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-semibold"
                          />
                        </div>
                      </td>
                      <td className="py-4 pr-2.5 align-bottom">
                        <input
                          type="text"
                          value={item.sacCode}
                          onChange={(e) =>
                            handleItemChange(index, "sacCode", e.target.value)
                          }
                          placeholder="e.g. 998314"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-4 pr-2.5 align-bottom">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(index, "qty", e.target.value)
                          }
                          className="w-full px-1.5 py-1.5 rounded-lg border border-slate-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-4 pr-2.5 align-bottom">
                        <input
                          type="number"
                          min="0"
                          value={item.rate || ""}
                          onChange={(e) =>
                            handleItemChange(index, "rate", e.target.value)
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-4 pr-2.5 align-bottom">
                        <input
                          type="number"
                          min="0"
                          value={item.gstRate}
                          onChange={(e) =>
                            handleItemChange(index, "gstRate", e.target.value)
                          }
                          className="w-full px-1.5 py-1.5 rounded-lg border border-slate-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-4 text-right font-black text-slate-900 pr-2 align-bottom pb-6">
                        ₹
                        {lineTotal.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-4 text-center align-bottom pb-5">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Item Button */}
          <button
            type="button"
            onClick={handleAddItem}
            className="text-xs font-bold text-[#5D5FEF] hover:text-[#4d4fdf] flex items-center gap-1 cursor-pointer select-none"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Item</span>
          </button>

          {/* GST Auto Calculations Info Box */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 text-xs text-indigo-950/80 space-y-1 select-none">
            <h4 className="font-extrabold text-[#5D5FEF]">
              GST is calculated automatically
            </h4>
            <p className="font-semibold text-slate-500">
              Place of Supply:{" "}
              <span className="text-[#5D5FEF] font-bold">
                {placeOfSupplyText}
              </span>
            </p>
            <p className="font-semibold text-slate-500">
              Tax Type:{" "}
              <span className="text-[#5D5FEF] font-bold">{taxTypeText}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Action Buttons Row */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={() => navigate("/invoices")}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleFormSubmit(null, false)}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={handlePreviewTrigger}
          className="px-5 py-2.5 rounded-xl border border-[#5D5FEF] text-[#5D5FEF] hover:bg-indigo-550 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Preview Invoice</span>
        </button>
        <button
          type="button"
          onClick={() => handleFormSubmit(null, true)}
          disabled={isSaving}
          className="bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSaving && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>Save & Send Invoice</span>
        </button>
      </div>
    </div>
  );
}
