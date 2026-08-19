import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Clock,
} from "lucide-react";

export default function RenewSubscriptionModal({
  isOpen,
  onClose,
  subscription,
  onRenewalSuccess,
  showToast,
  authenticatedFetch,
}) {
  if (!isOpen || !subscription) return null;

  const [durationValue, setDurationValue] = useState(subscription.durationValue || 1);
  const [durationUnit, setDurationUnit] = useState(subscription.durationUnit || "years");
  
  // Start date option: "continue" (from current endDate) or "today" or "custom"
  const [startMode, setStartMode] = useState("continue");
  const [customStartDate, setCustomStartDate] = useState("");
  
  const [baseAmount, setBaseAmount] = useState(subscription.baseAmount ?? subscription.amount ?? 0);
  const [isPersonalAccount, setIsPersonalAccount] = useState(subscription.isPersonalAccount || false);
  const [inclusiveGst, setInclusiveGst] = useState(subscription.inclusiveGst !== false);
  const [createInvoice, setCreateInvoice] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [paymentMethod, setPaymentMethod] = useState(subscription.paymentMethod || "bank_transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isDueDateCustom, setIsDueDateCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when subscription prop changes
  useEffect(() => {
    if (subscription) {
      setDurationValue(subscription.durationValue || 1);
      setDurationUnit(subscription.durationUnit || "years");
      setBaseAmount(subscription.baseAmount ?? subscription.amount ?? 0);
      setIsPersonalAccount(subscription.isPersonalAccount === true);
      setInclusiveGst(subscription.inclusiveGst !== false);
      setPaymentMethod(subscription.paymentMethod || "bank_transfer");
      setStartMode("continue");
      setIsDueDateCustom(false);
    }
  }, [subscription]);

  // Compute effective start date
  const getEffectiveStartDate = () => {
    const now = new Date();
    if (startMode === "today") return now;
    if (startMode === "custom" && customStartDate) return new Date(customStartDate);
    if (subscription.endDate && new Date(subscription.endDate) > now) {
      return new Date(subscription.endDate);
    }
    return now;
  };

  // Compute new calculated end date
  const getNewEndDate = () => {
    const start = getEffectiveStartDate();
    const result = new Date(start);
    const val = Number(durationValue) || 1;
    if (durationUnit === "months") {
      result.setMonth(result.getMonth() + val);
    } else {
      result.setFullYear(result.getFullYear() + val);
    }
    return result;
  };

  // Sync Due Date according to payment interval
  useEffect(() => {
    if (!isDueDateCustom) {
      const targetDate = paymentStatus === "Paid" ? new Date() : getNewEndDate();
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
      const dd = String(targetDate.getDate()).padStart(2, "0");
      setDueDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [durationValue, durationUnit, startMode, customStartDate, paymentStatus, isDueDateCustom]);

  // Compute Active Add-ons price sum
  const activeAddonsTotal = (subscription.services || [])
    .filter((s) => s.status === "active" && s.billingCycle === "monthly")
    .reduce((sum, s) => sum + (s.price || 0), 0);

  const subtotal = (Number(baseAmount) || 0) + activeAddonsTotal;
  
  // Tax calculation
  const isForeign = subscription.client?.isForeign || false;
  const gstRate = (isForeign || isPersonalAccount) ? 0 : 18;

  let taxAmount = 0;
  let totalAmount = subtotal;

  if (gstRate > 0) {
    if (inclusiveGst) {
      taxAmount = Math.round((subtotal - subtotal / 1.18) * 100) / 100;
      totalAmount = subtotal;
    } else {
      taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
      totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
    }
  }

  const effectiveStartDate = getEffectiveStartDate();
  const calculatedEndDate = getNewEndDate();

  const formatDate = (date) =>
    date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const handleQuickDuration = (val, unit) => {
    setDurationValue(val);
    setDurationUnit(unit);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        durationValue: Number(durationValue),
        durationUnit,
        startDate: startMode === "custom" ? customStartDate : (startMode === "today" ? new Date().toISOString() : undefined),
        baseAmount: Number(baseAmount),
        isPersonalAccount,
        inclusiveGst,
        createInvoice,
        paymentStatus,
        paymentMethod,
        referenceNo,
        notes,
        dueDate,
      };

      const fetchFn = authenticatedFetch || (async (url, opts = {}) => {
        const token = localStorage.getItem("token");
        return fetch(url, {
          ...opts,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...opts.headers,
          },
        });
      });

      const res = await fetchFn(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${subscription._id}/renew`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (res.ok) {
        const invMsg = data.invoiceNumber ? ` & Invoice #${data.invoiceNumber} generated!` : "";
        if (showToast) showToast(`${data.message}${invMsg}`, "success");
        if (onRenewalSuccess) onRenewalSuccess(data.subscription);
        onClose();
      } else {
        if (showToast) showToast(data.message || "Failed to renew subscription", "error");
      }
    } catch (err) {
      console.error("Error submitting subscription renewal:", err);
      if (showToast) showToast("Error processing subscription renewal.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientName = subscription.client?.companyName || subscription.client?.clientName || "Client";
  const subTypeName = subscription.type === "custom"
    ? (subscription.customType || "Custom Subscription")
    : subscription.type.replace(/_/g, " ").toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden my-8 transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-500/50 text-indigo-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-400/30 uppercase tracking-wider">
                  Manual Renewal
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">
                Renew {subTypeName}
              </h2>
              <p className="text-xs text-indigo-200 font-medium flex items-center gap-1.5 mt-0.5">
                <Building className="h-3.5 w-3.5" />
                <span>{clientName}</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Live Validity Calculation Banner */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border border-indigo-100/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
                  New Validity Period
                </div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {formatDate(effectiveStartDate)} &rarr;{" "}
                  <span className="text-indigo-600 font-black">{formatDate(calculatedEndDate)}</span>
                </div>
              </div>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-100 shadow-xs text-center shrink-0">
              <span className="text-xs font-bold text-indigo-700">
                +{durationValue} {durationUnit}
              </span>
            </div>
          </div>

          {/* 1. Renewal Term Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Renewal Duration</span>
              <span className="text-[11px] text-slate-400 font-normal">Select presets or custom</span>
            </label>
            
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "1 Year", val: 1, unit: "years" },
                { label: "6 Months", val: 6, unit: "months" },
                { label: "1 Month", val: 1, unit: "months" },
              ].map((preset) => {
                const isSelected = durationValue === preset.val && durationUnit === preset.unit;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleQuickDuration(preset.val, preset.unit)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/30"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Duration Value
                </label>
                <input
                  type="number"
                  min="1"
                  value={durationValue}
                  onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Duration Unit
                </label>
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Start Date Option */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Renewal Start Date
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                onClick={() => setStartMode("continue")}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  startMode === "continue"
                    ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="startMode"
                  checked={startMode === "continue"}
                  onChange={() => setStartMode("continue")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Extend Current Expiration
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Starts from {subscription.endDate ? formatDate(new Date(subscription.endDate)) : "current end"}
                  </div>
                </div>
              </label>

              <label
                onClick={() => setStartMode("today")}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  startMode === "today"
                    ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="startMode"
                  checked={startMode === "today"}
                  onChange={() => setStartMode("today")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Start Immediately (Today)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {formatDate(new Date())}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Pricing & Amount breakdown */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Renewal Amount ({subscription.currency || "INR (₹)"})
              </label>
              {activeAddonsTotal > 0 && (
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Includes +₹{activeAddonsTotal.toLocaleString("en-IN")} Active Addons
                </span>
              )}
            </div>

            {/* Personal Account & GST Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Personal Account Checkbox */}
              <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-100 p-3 rounded-xl">
                <input
                  type="checkbox"
                  id="renewIsPersonalAccount"
                  checked={isPersonalAccount}
                  disabled={isForeign}
                  onChange={(e) => setIsPersonalAccount(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400 border-slate-350 mt-0.5 cursor-pointer disabled:opacity-50"
                />
                <label htmlFor="renewIsPersonalAccount" className={`text-xs text-slate-700 font-bold select-none cursor-pointer flex flex-col gap-0.5 ${isForeign ? "opacity-50" : ""}`}>
                  <span>Personal Account</span>
                  <span className="text-[10px] text-slate-400 font-semibold normal-case leading-normal">
                    {isForeign ? "Disabled - foreign client." : "If checked, no GST will be applied (personal billing)."}
                  </span>
                </label>
              </div>

              {/* GST Inclusive Checkbox */}
              {!isPersonalAccount && !isForeign ? (
                <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <input
                    type="checkbox"
                    id="renewInclusiveGst"
                    checked={inclusiveGst}
                    onChange={(e) => setInclusiveGst(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-350 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="renewInclusiveGst" className="text-xs text-slate-700 font-bold select-none cursor-pointer flex flex-col gap-0.5">
                    <span>Inclusive GST (18%)</span>
                    <span className="text-[10px] text-slate-400 font-semibold normal-case leading-normal">
                      If unchecked, 18% GST is added to the base plan amount.
                    </span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl opacity-70">
                  <span className="text-[11px] font-semibold text-slate-500 italic">
                    {isForeign ? "GST Not Applicable (Foreign Client)" : "GST Not Applicable (Personal Account)"}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Base Plan Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={baseAmount}
                    onChange={(e) => setBaseAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Calculated Total {
                    isPersonalAccount ? "(Personal - No GST)" :
                    isForeign ? "(Foreign - No GST)" :
                    inclusiveGst ? "(GST Inclusive)" : "(+18% GST)"
                  }
                </label>
                <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 flex items-center justify-between">
                  <span>₹{totalAmount.toLocaleString("en-IN")}</span>
                  {gstRate > 0 && (
                    <span className="text-[10px] font-normal text-slate-500">
                      {inclusiveGst ? "Tax included: " : "Tax (+18%): "}₹{taxAmount.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Invoice Auto-Generation & Payment Options */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Auto Generate Invoice Toggle */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Auto-Generate Tax Invoice
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Creates an official invoice under Invoices with sequential invoice number.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={createInvoice}
                  onChange={(e) => setCreateInvoice(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Payment Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus("Paid")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      paymentStatus === "Paid"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Paid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus("Pending")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      paymentStatus === "Pending"
                        ? "border-amber-600 bg-amber-50 text-amber-700 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Pending</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>

            {/* Next Due Date Field (Pre-filled according to payment interval) */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Next Due Date</span>
                <span className="text-[10px] text-indigo-600 font-medium">
                  {paymentStatus === "Pending" ? "(Calculated from Payment Interval)" : "(Payment Date)"}
                </span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setIsDueDateCustom(true);
                }}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
              />
            </div>

            {/* Reference Number & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Reference / Transaction No (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Txn ID"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
                  Renewal Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Discount applied, renewed via email agreement"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing Renewal...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Confirm & Process Renewal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
