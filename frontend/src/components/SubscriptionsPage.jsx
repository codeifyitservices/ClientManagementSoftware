import React, { useState, useEffect } from "react";
import { 
  Plus, Calendar, DollarSign, AlertCircle, 
  Check, CheckCircle, Clock, Search, X, ShieldAlert, RefreshCw
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import SubscriptionTable, { getSubscriptionStatus } from "./SubscriptionTable";
import RenewSubscriptionModal from "./RenewSubscriptionModal";
import { SUPPORTED_CURRENCIES, getCurrencySymbol, formatWithINRConversion } from "../utils/currencyUtils";

export default function SubscriptionsPage({
  token,
  clients = [],
  showToast,
  authenticatedFetch
}) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form / Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [subToDelete, setSubToDelete] = useState(null);
  const [renewingSub, setRenewingSub] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingEmailIds, setSendingEmailIds] = useState({});

  // Form Field States
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState("hosting");
  const [customType, setCustomType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [currency, setCurrency] = useState("INR (₹)");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [autoRenew, setAutoRenew] = useState(true);
  const [renewalType, setRenewalType] = useState("automatic");
  const [planDetails, setPlanDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState("months");
  const [amount, setAmount] = useState("");
  const [inclusiveGst, setInclusiveGst] = useState(true);
  const [isPersonalAccount, setIsPersonalAccount] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions`
      );
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (err) {
      if (err.message !== "Unauthorized") {
        showToast("Failed to fetch subscriptions", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/alerts`
      );
      if (res.ok) {
        const data = await res.json();
        setActiveAlerts(data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchActiveAlerts();
  }, [token]);

  const handleOpenAddForm = () => {
    const defaultClient = clients[0];
    setSelectedSub(null);
    setClientId(defaultClient?._id || "");
    setType("hosting");
    setCustomType("");
    setPaymentMethod("bank_transfer");
    setCurrency(defaultClient?.isForeign ? "USD ($)" : "INR (₹)");
    setBillingCycle("monthly");
    setAutoRenew(true);
    setRenewalType("automatic");
    setPlanDetails("");
    setNotes("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setDurationValue(12);
    setDurationUnit("months");
    setAmount("");
    setInclusiveGst(true);
    setIsPersonalAccount(false);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (sub) => {
    setSelectedSub(sub);
    setClientId(sub.client?._id || "");
    setType(sub.type || "hosting");
    setCustomType(sub.customType || "");
    setPaymentMethod(sub.paymentMethod || "bank_transfer");
    setCurrency(sub.currency || "INR (₹)");
    setBillingCycle(sub.billingCycle || "monthly");
    setAutoRenew(sub.autoRenew !== false);
    setRenewalType(sub.renewalType || "automatic");
    setPlanDetails(sub.planDetails || "");
    setNotes(sub.notes || "");
    setStartDate(new Date(sub.startDate).toISOString().split("T")[0]);
    setDurationValue(sub.durationValue);
    setDurationUnit(sub.durationUnit);
    setAmount(sub.amount);
    setInclusiveGst(sub.inclusiveGst !== false);
    setIsPersonalAccount(sub.isPersonalAccount === true);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      showToast("Please select a client", "error");
      return;
    }
    if (type === "custom" && !customType.trim()) {
      showToast("Please enter a custom subscription name", "error");
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) < 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setIsSaving(true);
    const activeClient = clients.find((c) => c._id === clientId) || {};
    const subData = {
      client: clientId,
      type,
      customType: type === "custom" ? customType.trim() : "",
      paymentMethod,
      currency,
      billingCycle,
      autoRenew,
      renewalType,
      planDetails: planDetails.trim(),
      notes: notes.trim(),
      startDate,
      durationValue: Number(durationValue),
      durationUnit,
      amount: Number(amount),
      isPersonalAccount,
      inclusiveGst: (activeClient.isForeign || isPersonalAccount) ? false : inclusiveGst
    };

    try {
      const url = selectedSub
        ? `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${selectedSub._id}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions`;
      const method = selectedSub ? "PUT" : "POST";

      const res = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subData)
      });

      if (res.ok) {
        showToast(
          selectedSub ? "Subscription updated successfully" : "Subscription created successfully",
          "success"
        );
        setIsFormOpen(false);
        fetchSubscriptions();
        fetchActiveAlerts();
        
        // Dispatch event to notify layout/header that alerts might have changed
        window.dispatchEvent(new Event("subscriptionAlertsUpdated"));
      } else {
        const errorData = await res.json();
        const details = errorData.error ? `: ${errorData.error}` : "";
        showToast((errorData.message || "Failed to save subscription") + details, "error");
      }
    } catch (err) {
      if (err.message !== "Unauthorized") {
        showToast("Error saving subscription", "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!subToDelete) return;
    setIsDeleting(true);
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${subToDelete._id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        showToast("Subscription deleted successfully", "success");
        setSubToDelete(null);
        fetchSubscriptions();
        fetchActiveAlerts();
        window.dispatchEvent(new Event("subscriptionAlertsUpdated"));
      } else {
        showToast("Failed to delete subscription", "error");
      }
    } catch (err) {
      if (err.message !== "Unauthorized") {
        showToast("Error deleting subscription", "error");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDismissAlert = async (alert) => {
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${alert.subscriptionId}/dismiss-alert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alertType: alert.alertType })
        }
      );
      if (res.ok) {
        showToast("Alert dismissed in app", "success");
        fetchActiveAlerts();
        window.dispatchEvent(new Event("subscriptionAlertsUpdated"));
      }
    } catch (err) {
      showToast("Failed to dismiss alert", "error");
    }
  };

  const handleRunEmailCheck = async () => {
    try {
      showToast("Running subscription reminder check...", "info");
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/run-check`,
        { method: "POST" }
      );
      if (res.ok) {
        showToast("Email check executed successfully", "success");
        fetchSubscriptions();
        fetchActiveAlerts();
        window.dispatchEvent(new Event("subscriptionAlertsUpdated"));
      }
    } catch (err) {
      showToast("Error executing check", "error");
    }
  };

  const handleSendEmailManually = async (sub) => {
    if (!sub.client?.email) {
      showToast("Client profile has no associated email address", "error");
      return;
    }
    
    setSendingEmailIds((prev) => ({ ...prev, [sub._id]: true }));
    try {
      showToast(`Sending expiration reminder email to ${sub.client.email}...`, "info");
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${sub._id}/send-email`,
        { method: "POST" }
      );
      const data = await res.json();
      if (res.ok) {
        showToast(
          data.isFallback 
            ? `[TEST] Email sent! Preview: ${data.previewUrl}`
            : `Reminder email successfully sent to ${sub.client.email}!`,
          "success"
        );
        fetchSubscriptions();
        fetchActiveAlerts();
        window.dispatchEvent(new Event("subscriptionAlertsUpdated"));
      } else {
        showToast(data.message || "Failed to send email manually.", "error");
      }
    } catch (err) {
      showToast("Failed to send email manually.", "error");
    } finally {
      setSendingEmailIds((prev) => {
        const next = { ...prev };
        delete next[sub._id];
        return next;
      });
    }
  };

  // Status helper used for filtering
  const getSubscriptionStatus = (sub) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(sub.endDate);
    endDate.setHours(0, 0, 0, 0);
    if (today >= endDate) return { type: "expired" };
    const fifteenDays = new Date(sub.endDate);
    fifteenDays.setDate(fifteenDays.getDate() - 15);
    fifteenDays.setHours(0, 0, 0, 0);
    if (today >= fifteenDays) return { type: "expiring15" };
    const oneMonth = new Date(sub.endDate);
    oneMonth.setMonth(oneMonth.getMonth() - 1);
    oneMonth.setHours(0, 0, 0, 0);
    if (today >= oneMonth) return { type: "expiringMonth" };
    return { type: "active" };
  };

  // Filter & Search subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.client?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.client?.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.type?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || sub.type === typeFilter;
    const statusObj = getSubscriptionStatus(sub);
    let matchesStatus = statusFilter === "all";
    if (statusFilter === "active") matchesStatus = statusObj.type === "active";
    else if (statusFilter === "1month") matchesStatus = statusObj.diffDays <= 30 && statusObj.diffDays > 15;
    else if (statusFilter === "15days") matchesStatus = statusObj.diffDays <= 15 && statusObj.diffDays > 7;
    else if (statusFilter === "7days") matchesStatus = statusObj.diffDays <= 7 && statusObj.diffDays > 3;
    else if (statusFilter === "3days") matchesStatus = statusObj.diffDays <= 3 && statusObj.diffDays > 1;
    else if (statusFilter === "tomorrow") matchesStatus = statusObj.diffDays === 1;
    else if (statusFilter === "expired") matchesStatus = statusObj.diffDays <= 0;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleBulkDeleteSelected = async (ids) => {
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/bulk-delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids })
        }
      );
      if (res.ok) {
        showToast(`Successfully deleted ${ids.length} subscription${ids.length > 1 ? "s" : ""}`, "success");
        fetchSubscriptions();
        fetchActiveAlerts();
        window.dispatchEvent(new Event("subscriptionAlertsUpdated"));
      } else {
        showToast("Failed to bulk delete subscriptions", "error");
      }
    } catch (err) {
      showToast("Error executing bulk delete", "error");
    }
  };

  const getCalculatedEndDate = () => {
    if (!startDate || !durationValue || !durationUnit) return "";
    const d = new Date(startDate);
    const val = Number(durationValue);
    if (isNaN(val) || val <= 0) return "";
    
    if (durationUnit === "months") {
      d.setMonth(d.getMonth() + val);
    } else if (durationUnit === "years") {
      d.setFullYear(d.getFullYear() + val);
    }
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const getCalculatedNextPaymentDate = () => {
    if (!startDate) return "";
    const d = new Date(startDate);
    if (isNaN(d.getTime())) return "";

    if (billingCycle === "weekly") {
      d.setDate(d.getDate() + 7);
    } else if (billingCycle === "monthly") {
      d.setMonth(d.getMonth() + 1);
    } else if (billingCycle === "quarterly") {
      d.setMonth(d.getMonth() + 3);
    } else if (billingCycle === "yearly") {
      d.setFullYear(d.getFullYear() + 1);
    }

    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const activeClient = clients.find((c) => c._id === clientId) || {};

  const getCalculatedFinalAmount = () => {
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) return 0;
    if (activeClient.isForeign || isPersonalAccount) return amt;
    if (inclusiveGst) return amt;
    return Math.round(amt * 1.18 * 100) / 100;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Run Check Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Hosting & Maintenance Subscriptions
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Configure client hosting, AMC, and maintenance contracts. Automated reminder emails are dispatched 1 month and 15 days prior to expiration.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <button
            onClick={handleRunEmailCheck}
            className="px-4 py-2.5 rounded-xl border border-[#5D5FEF] bg-white text-[#5D5FEF] hover:bg-indigo-50 text-xs font-bold transition-all cursor-pointer shadow-sm text-center"
          >
            Trigger Email Check
          </button>
          <button
            onClick={handleOpenAddForm}
            className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/10 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {/* Active App Alerts Banner List */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-50/70 border border-red-100 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
            <ShieldAlert className="h-5 w-5 text-red-650" />
            <span>Active Approaching Renewal Expirations ({activeAlerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeAlerts.map((alert) => (
              <div 
                key={`${alert.subscriptionId}-${alert.alertType}`}
                className="bg-white border border-red-100 rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    alert.alertType === "15days" ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-amber-100 text-amber-600"
                  }`}>
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900 leading-tight">
                      {alert.client?.companyName}
                    </h5>
                    <p className="text-[10px] text-slate-550 mt-0.5 leading-relaxed">
                      {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} subscription expires on{" "}
                      <strong className="text-red-600">{new Date(alert.endDate).toLocaleDateString("en-IN")}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const target = subscriptions.find((s) => s._id === alert.subscriptionId) || alert;
                      setRenewingSub(target);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Renew Subscription"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Renew</span>
                  </button>
                  <button
                    onClick={() => handleDismissAlert(alert)}
                    className="bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 p-1.5 rounded-lg border border-slate-100 transition-all cursor-pointer flex items-center justify-center"
                    title="Dismiss Alert in App"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Table */}
      <div className="bg-white border border-slate-100 rounded-2xl custom-shadow overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, client name or type..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="all">All Types</option>
              <option value="hosting">Hosting</option>
              <option value="maintenance">Maintenance</option>
              <option value="digital_marketing">Digital Marketing</option>
              <option value="custom">Custom</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only (&gt;30d)</option>
              <option value="1month">1 Month Left</option>
              <option value="15days">15 Days Left</option>
              <option value="7days">7 Days Left</option>
              <option value="3days">3 Days Left</option>
              <option value="tomorrow">Tomorrow (1d)</option>
              <option value="expired">Expired / Due Today</option>
            </select>
          </div>
        </div>

        {/* Subscription Table */}
        <div className="p-4">
          <SubscriptionTable
            subscriptions={filteredSubscriptions}
            loading={loading}
            sendingEmailIds={sendingEmailIds}
            onEdit={handleOpenEditForm}
            onDelete={setSubToDelete}
            onSendEmail={handleSendEmailManually}
            onRenew={setRenewingSub}
            onDeleteSelected={handleBulkDeleteSelected}
          />
        </div>
      </div>

      {/* Create / Edit Subscription Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setIsFormOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-sm font-extrabold text-slate-900">
                {selectedSub ? "Edit Subscription" : "New Subscription Details"}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-650 hover:bg-slate-100 p-1.5 rounded-lg transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="p-6 space-y-4 text-xs font-semibold text-slate-700 overflow-y-auto flex-1">
                {/* Select Client */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-bold mb-1.5">
                    Select Client *
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    required
                  >
                    <option value="" disabled>-- Select a Client Profile --</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.companyName} ({c.clientName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type selection */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-bold mb-1.5">
                    Subscription Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "hosting", label: "Hosting" },
                      { id: "maintenance", label: "Maintenance" },
                      { id: "digital_marketing", label: "Digital Marketing" },
                      { id: "custom", label: "Custom" },
                    ].map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                          type === option.id
                            ? "border-[#5D5FEF] bg-indigo-50/50 text-[#5D5FEF] font-bold"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-semibold"
                        }`}
                      >
                        <input
                          type="radio"
                          name="subType"
                          value={option.id}
                          checked={type === option.id}
                          onChange={() => setType(option.id)}
                          className="h-4 w-4 text-[#5D5FEF] focus:ring-indigo-500"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>

                  {type === "custom" && (
                    <div className="mt-3">
                      <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-bold mb-1">
                        Custom Service Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter custom service name (e.g. SEO, Domain, Cloud)"
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Payment Method selection */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-bold mb-1.5">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    required
                  >
                    <option value="credit_debit_card">Credit/Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>

                {/* Plan Specs / Description */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-bold mb-1.5">
                    Plan Specifications / Details
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 10 GB SSD Storage, 100 GB Bandwidth, SSL Certificate included..."
                    value={planDetails}
                    onChange={(e) => setPlanDetails(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Start Date & Payment Interval */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-bold mb-1.5">
                      Start Date *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="h-4 w-4" />
                      </span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-bold mb-1.5">
                      Payment Interval *
                    </label>
                    <select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      required
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                {/* Next Payment Date Badge */}
                {startDate && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[10px] text-indigo-700 font-bold bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                      <span>Next Payment Date: <strong className="text-slate-900 font-black text-xs">{getCalculatedNextPaymentDate()}</strong></span>
                    </div>
                    {durationValue && Number(durationValue) > 0 && (
                      <span className="text-slate-500 font-medium">Contract Expiry: <strong className="text-slate-800 font-bold">{getCalculatedEndDate()}</strong></span>
                    )}
                  </div>
                )}

                {/* Duration and unit */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-bold mb-1.5">
                    Contract Duration *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      min="1"
                      value={durationValue}
                      onChange={(e) => setDurationValue(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                      required
                    />
                    <select
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    >
                      <option value="months">Month(s)</option>
                      <option value="years">Year(s)</option>
                    </select>
                  </div>
                </div>

                {/* Personal Account Checkbox */}
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 p-3 rounded-xl">
                  <input
                    type="checkbox"
                    id="isPersonalAccount"
                    checked={isPersonalAccount}
                    disabled={activeClient.isForeign}
                    onChange={(e) => setIsPersonalAccount(e.target.checked)}
                    className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400 border-slate-350 mt-0.5 cursor-pointer disabled:opacity-50"
                  />
                  <label htmlFor="isPersonalAccount" className={`text-xs text-slate-700 font-bold select-none cursor-pointer flex flex-col gap-0.5 ${activeClient.isForeign ? "opacity-50" : ""}`}>
                    <span>Personal Account</span>
                    <span className="text-[10px] text-slate-400 font-semibold normal-case leading-normal">
                      {activeClient.isForeign ? "Disabled - foreign client." : "If checked, no GST will be applied (personal/individual billing)."}
                    </span>
                  </label>
                </div>

                {/* GST Inclusive Checkbox — hidden for personal account and foreign clients */}
                {!isPersonalAccount && !activeClient.isForeign && (
                  <div className="flex items-start gap-2 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <input
                      type="checkbox"
                      id="inclusiveGst"
                      checked={inclusiveGst}
                      onChange={(e) => setInclusiveGst(e.target.checked)}
                      className="h-4 w-4 rounded text-[#5D5FEF] focus:ring-indigo-500 border-slate-350 mt-0.5 cursor-pointer"
                    />
                    <label htmlFor="inclusiveGst" className="text-xs text-slate-700 font-bold select-none cursor-pointer flex flex-col gap-0.5">
                      <span>Inclusive GST (18%)</span>
                      <span className="text-[10px] text-slate-400 font-semibold normal-case leading-normal">
                        If unchecked, 18% tax will automatically be added to obtain the final billing amount.
                      </span>
                    </label>
                  </div>
                )}

                {/* Currency & Base Amount */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-bold mb-1.5">
                      Currency *
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-bold"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.label}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-bold mb-1.5">
                      Base Amount ({getCurrencySymbol(currency)}) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450 font-bold text-xs">
                        {getCurrencySymbol(currency)}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Enter base amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
                <div className="text-left shrink-0">
                  <span className="text-[9px] uppercase tracking-wider text-slate-450 font-bold block select-none">
                    Total Final Amount
                  </span>
                  <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    {formatWithINRConversion(getCalculatedFinalAmount(), currency)}
                    {!isPersonalAccount && !activeClient.isForeign && !inclusiveGst && amount && (
                      <span className="text-[9px] text-[#5D5FEF] font-bold uppercase select-none">(+18% GST)</span>
                    )}
                    {isPersonalAccount && (
                      <span className="text-[9px] text-amber-500 font-bold uppercase select-none">(Personal)</span>
                    )}
                    {activeClient.isForeign && (
                      <span className="text-[9px] text-emerald-500 font-bold uppercase select-none">(Foreign)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSaving ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!subToDelete}
        onClose={() => setSubToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Subscription"
        message={`Delete subscription contract for ${subToDelete?.client?.companyName}? This action is permanent and cannot be undone.`}
        confirmText="Delete Contract"
        isDeleting={isDeleting}
      />

      {/* Renew Subscription Modal */}
      <RenewSubscriptionModal
        isOpen={!!renewingSub}
        onClose={() => setRenewingSub(null)}
        subscription={renewingSub}
        authenticatedFetch={authenticatedFetch}
        onRenewalSuccess={() => {
          fetchSubscriptions();
          fetchActiveAlerts();
          window.dispatchEvent(new Event("subscriptionAlertsUpdated"));
        }}
        showToast={showToast}
      />
    </div>
  );
}
