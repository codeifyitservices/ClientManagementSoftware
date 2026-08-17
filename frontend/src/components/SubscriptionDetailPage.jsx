import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  ChevronRight,
  Globe,
  Mail,
  Phone,
  Download,
  Eye,
  Edit2,
  ShieldAlert,
  CheckCircle,
  RefreshCw,
  X,
  Filter,
  FileCheck,
  Sparkles,
  Building2,
  User,
  Trash2,
} from "lucide-react";
import {
  formatWithINRConversion,
  getCurrencySymbol,
  SUPPORTED_CURRENCIES,
  getSubscriptionCode,
} from "../utils/currencyUtils";

export default function SubscriptionDetailPage({
  token,
  clients = [],
  showToast,
  authenticatedFetch,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("paymentHistory");
  const [invoices, setInvoices] = useState([]);

  // Record Payment Modal State
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState("INR (₹)");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [billingPeriodText, setBillingPeriodText] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Add Service / Addon Modal State
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [serviceCurrency, setServiceCurrency] = useState("INR (₹)");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceBillingCycle, setServiceBillingCycle] = useState("monthly");
  const [isSavingService, setIsSavingService] = useState(false);

  // Notes state
  const [notesText, setNotesText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Fetch subscription details
  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${id}`,
      );
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        setNotesText(data.notes || "");
        if (data.currency) {
          setPaymentCurrency(data.currency);
          setServiceCurrency(data.currency);
        }
      } else {
        const listRes = await authenticatedFetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions`,
        );
        if (listRes.ok) {
          const list = await listRes.json();
          const found = list.find((s) => s._id === id);
          if (found) {
            setSubscription(found);
            setNotesText(found.notes || "");
            if (found.currency) {
              setPaymentCurrency(found.currency);
              setServiceCurrency(found.currency);
            }
          } else {
            showToast("Subscription not found", "error");
            navigate("/subscriptions");
          }
        }
      }
    } catch (err) {
      showToast("Error fetching subscription details", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch invoices associated with the client
  const fetchClientInvoices = async (clientId) => {
    if (!clientId) return;
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/invoices`,
      );
      if (res.ok) {
        const data = await res.json();
        const clientInvs = data.filter(
          (inv) => inv.client?._id === clientId || inv.client === clientId,
        );
        setInvoices(clientInvs);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchSubscriptionDetails();
  }, [id, token]);

  useEffect(() => {
    if (subscription?.client?._id) {
      fetchClientInvoices(subscription.client._id);
    }
  }, [subscription]);

  // Handler for Recording a Real Payment
  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) {
      showToast("Please enter a valid payment amount", "error");
      return;
    }

    setIsSavingPayment(true);
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${subscription._id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentDate,
            invoiceNumber:
              invoiceNo.trim() ||
              `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
            billingPeriod:
              billingPeriodText.trim() ||
              `${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
            amount: Number(paymentAmount),
            paymentMethod,
            referenceNo: paymentRef.trim(),
            status: paymentStatus,
          }),
        },
      );

      if (res.ok) {
        const updatedSub = await res.json();
        setSubscription(updatedSub);
        showToast("Payment recorded successfully!", "success");
        setIsRecordPaymentOpen(false);
        setPaymentAmount("");
        setPaymentRef("");
        setInvoiceNo("");
        setBillingPeriodText("");
      } else {
        showToast("Failed to record payment", "error");
      }
    } catch (err) {
      showToast("Error saving payment", "error");
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Handler for Deleting a Recorded Payment
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm("Are you sure you want to remove this payment record?"))
      return;
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${subscription._id}/payments/${paymentId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        const updatedSub = await res.json();
        setSubscription(updatedSub);
        showToast("Payment record deleted", "success");
      } else {
        showToast("Failed to delete payment record", "error");
      }
    } catch (err) {
      showToast("Error deleting payment", "error");
    }
  };

  // Handler for Adding a Service / Addon
  const handleAddServiceSubmit = async (e) => {
    e.preventDefault();
    if (
      !serviceName.trim() ||
      !servicePrice ||
      isNaN(servicePrice) ||
      Number(servicePrice) < 0
    ) {
      showToast("Enter a valid name and price", "error");
      return;
    }
    setIsSavingService(true);
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${subscription._id}/services`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: serviceName.trim(),
            price: Number(servicePrice),
            billingCycle: serviceBillingCycle,
          }),
        },
      );
      if (res.ok) {
        const updatedSub = await res.json();
        setSubscription(updatedSub);
        showToast("Add-on added successfully!", "success");
        setIsAddServiceOpen(false);
        setServiceName("");
        setServicePrice("");
        setServiceBillingCycle("monthly");
      } else {
        showToast("Failed to add add-on", "error");
      }
    } catch (err) {
      showToast("Error adding add-on", "error");
    } finally {
      setIsSavingService(false);
    }
  };

  // Handler for Removing a Service / Addon (Soft Delete)
  const handleRemoveService = async (serviceId) => {
    if (
      !window.confirm(
        "Remove this add-on? This will lower the recurring amount.",
      )
    )
      return;
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${subscription._id}/services/${serviceId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        const updatedSub = await res.json();
        setSubscription(updatedSub);
        showToast("Add-on removed", "success");
      } else {
        showToast("Failed to remove add-on", "error");
      }
    } catch (err) {
      showToast("Error removing add-on", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-bold">
            Loading Subscription Details...
          </span>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-8 text-center bg-slate-50 min-h-screen">
        <h3 className="text-lg font-bold text-slate-700">
          Subscription not found
        </h3>
        <button
          onClick={() => navigate("/subscriptions")}
          className="mt-4 px-4 py-2 bg-[#5D5FEF] text-white rounded-xl text-xs font-bold"
        >
          Back to Subscriptions
        </button>
      </div>
    );
  }

  const client = subscription.client || {};
  const currency = subscription.currency || "INR (₹)";
  const currencySym = getCurrencySymbol(currency);
  const formattedSubId = getSubscriptionCode(subscription);

  // Calculated Days Left & Expiration
  const endDate = new Date(subscription.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endMidnight = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );
  const diffTime = endMidnight.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpired = diffDays <= 0;

  // Type label calculation
  const displayType =
    subscription.type === "custom"
      ? subscription.customType || "Custom Service"
      : subscription.type
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

  // Payment method format helper
  const formatPaymentMethod = (pm) => {
    switch (pm) {
      case "credit_debit_card":
        return "Credit/Debit Card";
      case "upi":
        return "UPI";
      case "bank_transfer":
      default:
        return "Bank Transfer";
    }
  };

  // Real payment history from MongoDB sub-document array
  const paymentsList = subscription.payments || [];

  // Derived Services & Add-ons calculations
  const servicesList = subscription.services || [];
  const activeServices = servicesList.filter((s) => s.status === "active");
  const activeAddons = activeServices.filter(
    (s) => s.billingCycle === "monthly",
  );
  const totalAddonAmount = activeAddons.reduce(
    (sum, s) => sum + Number(s.price || 0),
    0,
  );
  const baseAmount = subscription.baseAmount ?? subscription.amount ?? 0;
  const totalAmount = baseAmount + totalAddonAmount;

  // Build itemized list for Generate Invoice
  const buildInvoiceItems = () => {
    const baseItem = {
      serviceName: displayType,
      description: `${displayType} Subscription Base Plan`,
      sacCode: "998314",
      amount: baseAmount,
      rate: baseAmount,
      qty: 1,
      gstRate: 18,
    };

    const addonItems = activeServices.map((addon) => ({
      serviceName: addon.name,
      description: `Add-on: ${addon.name} (${addon.billingCycle === "one_time" ? "One-time" : "Monthly"})`,
      sacCode: "998314",
      amount: addon.price,
      rate: addon.price,
      qty: 1,
      gstRate: 18,
    }));

    return [baseItem, ...addonItems];
  };

  // Summary Metrics calculated from Real Payments
  const paidPayments = paymentsList.filter((p) => p.status === "Paid");
  const pendingPayments = paymentsList.filter((p) => p.status === "Pending");
  const failedPayments = paymentsList.filter((p) => p.status === "Failed");

  const totalPaidAmount = paidPayments.reduce(
    (acc, p) => acc + (p.amount || 0),
    0,
  );
  const totalPendingAmount = pendingPayments.reduce(
    (acc, p) => acc + (p.amount || 0),
    0,
  );
  const totalFailedAmount = failedPayments.reduce(
    (acc, p) => acc + (p.amount || 0),
    0,
  );

  const lastPayment =
    paymentsList.length > 0 ? paymentsList[paymentsList.length - 1] : null;

  // Calculate accurate Next Billing Date based on billing cycle (Monthly vs Yearly)
  const computeNextBillingDate = () => {
    const isMonthly =
      subscription.billingCycle === "monthly" ||
      subscription.durationUnit === "months";
    const start = new Date(subscription.startDate);
    const end = new Date(subscription.endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (!isMonthly) {
      return end;
    }

    let baseDate = start;
    if (paidPayments && paidPayments.length > 0) {
      const lastP = paidPayments[paidPayments.length - 1];
      if (lastP.paymentDate) {
        baseDate = new Date(lastP.paymentDate);
      }
    }

    let nextBill = new Date(baseDate);
    if (nextBill <= now) {
      nextBill.setMonth(nextBill.getMonth() + 1);
    }

    if (nextBill > end) {
      nextBill = end;
    }

    return nextBill;
  };

  const nextBillingDateObj = computeNextBillingDate();
  const nextBillMidnight = new Date(
    nextBillingDateObj.getFullYear(),
    nextBillingDateObj.getMonth(),
    nextBillingDateObj.getDate(),
  );
  const nextBillDiffTime = nextBillMidnight.getTime() - today.getTime();
  const nextBillDiffDays = Math.ceil(nextBillDiffTime / (1000 * 60 * 60 * 24));

  const monthsTimeline = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentMonthIndex = new Date().getMonth();

  // Helper field component
  const Field = ({ label, children }) => (
    <div className="space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
        {label}
      </span>
      <div className="text-xs font-black text-slate-900 leading-tight">
        {children}
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 text-slate-800 space-y-8 animate-fade-in">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Top Navigation & Breadcrumbs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
              <Link
                to="/subscriptions"
                className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Subscriptions</span>
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-extrabold">
                {client.companyName || "Subscription Details"}
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                isExpired
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {isExpired ? "Expired" : "Active Subscription"}
            </span>
          </div>

          {/* Company Header Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-7 custom-shadow space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-lg shadow-xs">
                    {client.companyName
                      ? client.companyName[0].toUpperCase()
                      : "C"}
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">
                      {client.companyName || "Client Company"}
                    </h1>
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                      <span>Client Code: {client.clientCode || "CLI-001"}</span>
                      <span>•</span>
                      <span>Service: {displayType}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 pt-1">
                  {client.website && (
                    <a
                      href={
                        client.website.startsWith("http")
                          ? client.website
                          : `https://${client.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 hover:text-indigo-600"
                    >
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                      <span>{client.website}</span>
                    </a>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{client.email}</span>
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{client.phone}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Top Header Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setPaymentAmount(totalAmount || "");
                    setIsRecordPaymentOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span>Record Payment</span>
                </button>
                <button
                  onClick={() =>
                    navigate("/invoices/create", {
                      state: {
                        client: client._id || client,
                        amount: totalAmount,
                        currency: subscription.currency,
                        serviceName: displayType,
                        items: buildInvoiceItems(),
                      },
                    })
                  }
                  className="px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span>Generate Invoice</span>
                </button>
                <button
                  onClick={() => navigate("/subscriptions")}
                  className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Subscription</span>
                </button>
              </div>
            </div>

            {/* Hero Parameter Card (Matching Reference Layout) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left Feature Column (Plan Name & Features) */}
                <div className="lg:col-span-4 flex flex-col justify-between space-y-3 lg:pr-6 border-b lg:border-b-0 lg:border-r border-slate-100 pb-5 lg:pb-0">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Plan
                    </span>
                    <h2 className="text-lg font-black text-[#5D5FEF] tracking-tight">
                      {displayType}
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                      {subscription.planDetails ||
                        "10 GB SSD Storage, 100 GB Bandwidth, 5 Addon Domains, Daily Backup, SSL Certificate & more."}
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab("services")}
                    className="text-xs font-extrabold text-[#5D5FEF] hover:text-[#4d4fdf] inline-flex items-center gap-1 cursor-pointer pt-1 transition-colors select-none"
                  >
                    <span>View Plan Details</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Right Parameter Matrix (2 Rows x 4 Columns) */}
                <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-6 items-start">
                  {/* Row 1, Col 1: Billing Cycle */}
                  <Field label="Billing Cycle">
                    <span className="capitalize text-slate-900 font-bold">
                      {subscription.billingCycle ||
                        (subscription.durationUnit === "years"
                          ? "Yearly"
                          : "Monthly")}
                    </span>
                  </Field>

                  {/* Row 1, Col 2: Amount */}
                  <Field label="Amount">
                    <span className="text-slate-900 font-black">
                      {currencySym}
                      {Number(totalAmount).toLocaleString("en-IN")}{" "}
                      <span className="text-[10px] text-slate-400 font-semibold">
                        /{" "}
                        {subscription.billingCycle === "yearly" ||
                        subscription.durationUnit === "years"
                          ? "year"
                          : "month"}
                      </span>
                    </span>
                  </Field>

                  {/* Row 1, Col 3: Start Date */}
                  <Field label="Start Date">
                    <span className="text-slate-900 font-bold">
                      {new Date(subscription.startDate).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </Field>

                  {/* Row 1, Col 4: Next Billing Date (Highlighted Box) */}
                  <div className="bg-[#5D5FEF]/5 border border-[#5D5FEF]/10 rounded-xl p-3 space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#5D5FEF] block">
                      Next Billing Date
                    </span>
                    <span className="text-xs font-black text-slate-900 block leading-tight">
                      {nextBillingDateObj.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold block ${
                        nextBillDiffDays <= 15
                          ? "text-rose-600 animate-pulse"
                          : "text-[#5D5FEF]"
                      }`}
                    >
                      {nextBillDiffDays <= 0
                        ? "Due Today"
                        : `${nextBillDiffDays} days left`}
                    </span>
                  </div>

                  {/* Row 2, Col 1: Auto Renew */}
                  <Field label="Auto Renew">
                    <span className="text-slate-900 font-bold">
                      {subscription.autoRenew !== false ? "Yes" : "No"}
                    </span>
                  </Field>

                  {/* Row 2, Col 2: Payment Method */}
                  <Field label="Payment Method">
                    <span className="text-slate-900 font-bold">
                      {formatPaymentMethod(subscription.paymentMethod)}
                    </span>
                  </Field>

                  {/* Row 2, Col 3: Renewal Type */}
                  <Field label="Renewal Type">
                    <span className="capitalize text-slate-900 font-bold">
                      {subscription.renewalType || "Automatic"}
                    </span>
                  </Field>

                  {/* Row 2, Col 4: Subscription ID */}
                  <Field label="Subscription ID">
                    <span className="text-slate-900 font-black">
                      {formattedSubId}
                    </span>
                  </Field>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: Left Tabs + Right Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (2 Cols) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Navigation Tabs Header */}
              <div className="border-b border-slate-200 flex items-center gap-7 overflow-x-auto text-xs font-bold text-slate-500 scrollbar-none">
                {[
                  { id: "overview", label: "Overview" },
                  { id: "invoices", label: `Invoices (${invoices.length})` },
                  {
                    id: "paymentHistory",
                    label: `Payment History (${paymentsList.length})`,
                  },
                  { id: "renewals", label: "Renewals" },
                  { id: "services", label: `Services & Addons (${activeServices.length})` },
                  { id: "notes", label: "Notes" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-4 px-1 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-[#5D5FEF] text-[#5D5FEF] font-black"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: PAYMENT HISTORY */}
              {activeTab === "paymentHistory" && (
                <div className="space-y-8 animate-fade-in">
                  {/* Table Card */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl custom-shadow overflow-hidden p-7 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-900">
                          Payment History
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                          Complete history of all payments made for this
                          subscription.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setPaymentAmount(totalAmount || "");
                          setIsRecordPaymentOpen(true);
                        }}
                        className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Record Payment</span>
                      </button>
                    </div>

                    {/* Payments Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-5 py-3.5">Payment Date</th>
                            <th className="px-5 py-3.5">Invoice No.</th>
                            <th className="px-5 py-3.5">Billing Period</th>
                            <th className="px-5 py-3.5">Amount</th>
                            <th className="px-5 py-3.5">Method</th>
                            <th className="px-5 py-3.5">Reference / UTR</th>
                            <th className="px-5 py-3.5">Status</th>
                            <th className="px-5 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                          {paymentsList.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="px-5 py-8 text-center text-slate-400 text-xs"
                              >
                                No payment records yet. Click "Record Payment"
                                to add one.
                              </td>
                            </tr>
                          ) : (
                            paymentsList.map((p, idx) => (
                              <tr
                                key={p._id || idx}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                <td className="px-5 py-4 font-bold text-slate-900 whitespace-nowrap">
                                  {new Date(p.paymentDate).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </td>
                                <td className="px-5 py-4 font-bold text-indigo-600 whitespace-nowrap">
                                  {p.invoiceNumber || "-"}
                                </td>
                                <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                                  {p.billingPeriod || "-"}
                                </td>
                                <td className="px-5 py-4 font-black text-slate-900 whitespace-nowrap">
                                  {currencySym}
                                  {Number(p.amount || 0).toLocaleString(
                                    "en-IN",
                                  )}
                                </td>
                                <td className="px-5 py-4 font-medium whitespace-nowrap">
                                  {formatPaymentMethod(p.paymentMethod)}
                                </td>
                                <td className="px-5 py-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                  {p.referenceNo || "-"}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase ${
                                      p.status === "Paid"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : p.status === "Pending"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-rose-50 text-rose-700"
                                    }`}
                                  >
                                    {p.status || "Paid"}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => handleDeletePayment(p._id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                    title="Delete payment record"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Footer */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-medium">
                      <span>
                        Showing {paymentsList.length > 0 ? 1 : 0} to{" "}
                        {paymentsList.length} of {paymentsList.length} payments
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                          disabled
                        >
                          &lt;
                        </button>
                        <button className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold">
                          1
                        </button>
                        <button
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                          disabled
                        >
                          &gt;
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary Cards (Icons Above) */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Payment Summary
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                      {/* Card 1: Total Paid */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 custom-shadow flex flex-col justify-between space-y-4">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                            Total Paid
                          </span>
                          <span className="text-base font-black text-slate-900 block leading-tight">
                            {currencySym}
                            {totalPaidAmount.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold block mt-1">
                            {paidPayments.length}{" "}
                            {paidPayments.length === 1 ? "payment" : "payments"}
                          </span>
                        </div>
                      </div>

                      {/* Card 2: Total Pending */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 custom-shadow flex flex-col justify-between space-y-4">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                            Total Pending
                          </span>
                          <span className="text-base font-black text-slate-900 block leading-tight">
                            {currencySym}
                            {totalPendingAmount.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold block mt-1">
                            {pendingPayments.length}{" "}
                            {pendingPayments.length === 1
                              ? "payment"
                              : "payments"}
                          </span>
                        </div>
                      </div>

                      {/* Card 3: Total Failed */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 custom-shadow flex flex-col justify-between space-y-4">
                        <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                            Total Failed
                          </span>
                          <span className="text-base font-black text-slate-900 block leading-tight">
                            {currencySym}
                            {totalFailedAmount.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold block mt-1">
                            {failedPayments.length}{" "}
                            {failedPayments.length === 1
                              ? "payment"
                              : "payments"}
                          </span>
                        </div>
                      </div>

                      {/* Card 4: Last Payment */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 custom-shadow flex flex-col justify-between space-y-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                            Last Payment
                          </span>
                          <span className="text-base font-black text-slate-900 block leading-tight">
                            {lastPayment
                              ? new Date(
                                  lastPayment.paymentDate,
                                ).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "None"}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold block mt-1">
                            {lastPayment
                              ? `via ${formatPaymentMethod(lastPayment.paymentMethod)}`
                              : "No record"}
                          </span>
                        </div>
                      </div>

                      {/* Card 5: Next Payment */}
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 custom-shadow flex flex-col justify-between space-y-4">
                        <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                            Next Payment
                          </span>
                          <span className="text-base font-black text-slate-900 block leading-tight">
                            {nextBillingDateObj.toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-xs text-rose-500 font-extrabold block mt-1">
                            {nextBillDiffDays <= 0
                              ? "Due Today"
                              : `${nextBillDiffDays} days left`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Annual View Timeline */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-7 custom-shadow space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        Annual View ({new Date().getFullYear()})
                      </h4>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
                          Paid
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />{" "}
                          Pending
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />{" "}
                          Failed
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-3 pt-2">
                      {monthsTimeline.map((m, idx) => {
                        const monthPaid = paymentsList.some((p) => {
                          const d = new Date(p.paymentDate);
                          return (
                            d.getMonth() === idx &&
                            d.getFullYear() === new Date().getFullYear() &&
                            p.status === "Paid"
                          );
                        });
                        const isPastMonth = idx <= currentMonthIndex;

                        return (
                          <div
                            key={m}
                            className="flex flex-col items-center gap-2"
                          >
                            <span className="text-[10px] font-extrabold text-slate-400">
                              {m}
                            </span>
                            <div
                              className={`h-9 w-9 rounded-full flex items-center justify-center border transition-all ${
                                monthPaid ||
                                (isPastMonth && paymentsList.length > 0)
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-600 font-black shadow-xs"
                                  : "bg-slate-50 border-slate-200 text-slate-300"
                              }`}
                            >
                              {monthPaid ||
                              (isPastMonth && paymentsList.length > 0) ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Clock className="h-3.5 w-3.5 text-slate-300" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INVOICES */}
              {activeTab === "invoices" && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-7 custom-shadow space-y-4 animate-fade-in">
                  <h3 className="text-sm font-black text-slate-900">
                    Associated Client Invoices
                  </h3>
                  {invoices.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center font-semibold">
                      No invoices generated for this client yet. Click "Generate
                      Invoice" on top to create one.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-5 py-3.5">Invoice #</th>
                            <th className="px-5 py-3.5">Date</th>
                            <th className="px-5 py-3.5">Due Date</th>
                            <th className="px-5 py-3.5">Total Amount</th>
                            <th className="px-5 py-3.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                          {invoices.map((inv) => (
                            <tr key={inv._id} className="hover:bg-slate-50">
                              <td className="px-5 py-4 font-bold text-indigo-600">
                                {inv.invoiceNumber}
                              </td>
                              <td className="px-5 py-4">
                                {new Date(inv.invoiceDate).toLocaleDateString(
                                  "en-IN",
                                )}
                              </td>
                              <td className="px-5 py-4">
                                {new Date(inv.dueDate).toLocaleDateString(
                                  "en-IN",
                                )}
                              </td>
                              <td className="px-5 py-4 font-black text-slate-900">
                                ₹
                                {Number(inv.totalAmount).toLocaleString(
                                  "en-IN",
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase ${
                                    inv.paymentStatus === "Paid"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {inv.paymentStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-7 custom-shadow space-y-5 animate-fade-in text-xs text-slate-700 font-medium leading-relaxed">
                  <h3 className="text-sm font-black text-slate-900">
                    Subscription Overview
                  </h3>
                  <p>
                    This subscription contract guarantees {displayType}{" "}
                    services for <strong>{client.companyName}</strong>. Service
                    SLA includes 24/7 server monitoring, routine database
                    backups, and security patching.
                  </p>
                  <div className="grid grid-cols-2 gap-5 pt-2">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Service Level
                      </span>
                      <span className="text-sm font-extrabold text-slate-800">
                        Enterprise Gold SLA
                      </span>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Billing Type
                      </span>
                      <span className="text-sm font-extrabold text-slate-800">
                        {subscription.inclusiveGst
                          ? "Tax Inclusive"
                          : "Tax Exclusive (+18% GST)"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: RENEWALS */}
              {activeTab === "renewals" && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-7 custom-shadow space-y-5 animate-fade-in">
                  <h3 className="text-sm font-black text-slate-900">
                    Renewal Schedule & History
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Automatic renewal reminders are sent 30 days and 15 days
                    prior to contract expiration.
                  </p>
                  <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900">
                        Next Scheduled Renewal
                      </h4>
                      <p className="text-xs text-indigo-600 font-bold">
                        {new Date(subscription.endDate).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )}{" "}
                        ({diffDays} days left)
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        showToast("Manual renewal triggered", "success")
                      }
                      className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-indigo-500 transition-colors cursor-pointer shrink-0"
                    >
                      Trigger Manual Renewal
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: SERVICES & ADDONS */}
              {activeTab === "services" && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-7 custom-shadow space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Services & Add-ons
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Manage extra recurring or one-time add-on services for this subscription.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setServiceName("");
                        setServicePrice("");
                        setServiceBillingCycle("monthly");
                        setIsAddServiceOpen(true);
                      }}
                      className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Add-on</span>
                    </button>
                  </div>

                  {/* Base Plan Row */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Base Subscription Plan
                      </span>
                      <h4 className="text-sm font-black text-slate-900">{displayType}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-indigo-600">
                        {currencySym}{baseAmount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Base Plan Price
                      </span>
                    </div>
                  </div>

                  {/* Active Add-ons Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Active Add-ons ({activeServices.length})
                    </h4>
                    {activeServices.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center font-semibold bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        No add-ons added yet. Click "Add Add-on" to include extra services.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="px-5 py-3">Add-on Name</th>
                              <th className="px-5 py-3">Billing Cycle</th>
                              <th className="px-5 py-3">Price</th>
                              <th className="px-5 py-3">Added Date</th>
                              <th className="px-5 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                            {activeServices.map((service) => (
                              <tr key={service._id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-3.5 font-bold text-slate-900">
                                  {service.name}
                                </td>
                                <td className="px-5 py-3.5">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                                      service.billingCycle === "one_time"
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-indigo-50 text-indigo-700"
                                    }`}
                                  >
                                    {service.billingCycle === "one_time" ? "One-Time" : "Monthly"}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 font-black text-slate-900">
                                  {currencySym}{Number(service.price).toLocaleString("en-IN")}{" "}
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    {service.billingCycle === "monthly" ? "/mo" : "one-time"}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                                  {new Date(service.addedAt || Date.now()).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <button
                                    onClick={() => handleRemoveService(service._id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                    title="Remove add-on"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Billing Summary Strip */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 custom-shadow">
                    <div className="flex items-center gap-6 text-xs font-semibold">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                          Base Plan
                        </span>
                        <span className="text-white font-bold">
                          {currencySym}{baseAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <span className="text-slate-600 font-bold">+</span>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                          Monthly Add-ons
                        </span>
                        <span className="text-indigo-300 font-bold">
                          {currencySym}{totalAddonAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 block font-extrabold">
                        Total Recurring Amount
                      </span>
                      <span className="text-base font-black text-emerald-400">
                        {currencySym}{totalAmount.toLocaleString("en-IN")}{" "}
                        <span className="text-[10px] text-emerald-300 font-semibold">/ month</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: NOTES */}
              {activeTab === "notes" && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-7 custom-shadow space-y-5 animate-fade-in">
                  <h3 className="text-sm font-black text-slate-900">
                    Subscription Notes
                  </h3>
                  <textarea
                    rows={5}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Enter internal notes regarding client server requirements, maintenance logs, or special instructions..."
                    className="w-full p-4 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        setIsSavingNote(true);
                        try {
                          const res = await authenticatedFetch(
                            `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${subscription._id}`,
                            {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ notes: notesText }),
                            },
                          );
                          if (res.ok) {
                            showToast("Subscription notes saved", "success");
                            fetchSubscriptionDetails();
                          }
                        } catch (e) {
                          showToast("Error saving notes", "error");
                        } finally {
                          setIsSavingNote(false);
                        }
                      }}
                      disabled={isSavingNote}
                      className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSavingNote ? "Saving..." : "Save Notes"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar Column (1 Col) */}
            <div className="space-y-8">
              {/* Card 1: Subscription Summary & Donut Chart */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-7 custom-shadow space-y-5">
                <h3 className="text-sm font-black text-slate-900">
                  Subscription Summary
                </h3>

                {/* Donut Chart representation */}
                <div className="flex items-center justify-between pt-2">
                  <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                    <svg
                      className="w-full h-full transform -rotate-90"
                      viewBox="0 0 36 36"
                    >
                      <path
                        className="text-slate-100"
                        strokeWidth="3.8"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-emerald-500"
                        strokeDasharray={`${paymentsList.length > 0 ? 100 : 0}, 100`}
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Paid
                      </span>
                      <span className="text-xs font-black text-emerald-600">
                        {paymentsList.length > 0 ? "100%" : "0%"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>Paid</span>
                      <span className="ml-auto font-black text-slate-900">
                        {currencySym}
                        {totalPaidAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      <span>Pending</span>
                      <span className="ml-auto font-black text-slate-900">
                        {currencySym}
                        {totalPendingAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      <span>Failed</span>
                      <span className="ml-auto font-black text-slate-900">
                        {currencySym}
                        {totalFailedAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      Total Paid
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      {currencySym}
                      {totalPaidAmount.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      Total Invoices
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      {invoices.length || paymentsList.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      Outstanding
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      {currencySym}
                      {totalPendingAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Status Banner */}
                <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3.5 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    {paymentsList.length > 0
                      ? "Everything is up to date! 🎉 All payments are cleared."
                      : "No payments recorded yet."}
                  </span>
                </div>
              </div>

              {/* Card 2: Upcoming Renewals */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-7 custom-shadow space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900">
                      Upcoming Renewals
                    </h3>
                  </div>
                </div>

                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4.5 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-indigo-500 block">
                    Next Billing Date
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900">
                      {nextBillingDateObj.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-600 text-[10px] font-extrabold">
                      {nextBillDiffDays <= 0
                        ? "Due Today"
                        : `${nextBillDiffDays} days left`}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs font-semibold text-slate-600 pt-1">
                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span>Recurring Amount</span>
                    <span className="font-black text-slate-900">
                      {currencySym}
                      {Number(totalAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span>Billing Cycle</span>
                    <span className="font-bold text-slate-800 capitalize">
                      {subscription.billingCycle ||
                        (subscription.durationUnit === "years"
                          ? "Yearly"
                          : "Monthly")}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2.5">
                    <span>Renewal Type</span>
                    <span className="font-bold text-slate-800 capitalize">
                      {subscription.renewalType || "Automatic"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Method</span>
                    <span className="font-bold text-slate-800">
                      {formatPaymentMethod(subscription.paymentMethod)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("renewals")}
                  className="w-full py-3 rounded-xl border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-bold transition-all cursor-pointer text-center"
                >
                  View Renewal Schedule
                </button>
              </div>

              {/* Card 3: Quick Actions */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-7 custom-shadow space-y-3.5">
                <h3 className="text-sm font-black text-slate-900 mb-2">
                  Quick Actions
                </h3>

                <button
                  onClick={() => {
                    setPaymentAmount(totalAmount || "");
                    setIsRecordPaymentOpen(true);
                  }}
                  className="w-full p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/30 text-xs font-bold text-slate-700 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <span>Record Payment</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  onClick={() =>
                    navigate("/invoices/create", {
                      state: {
                        client: client._id || client,
                        amount: totalAmount,
                        currency: subscription.currency,
                        serviceName: displayType,
                        items: buildInvoiceItems(),
                      },
                    })
                  }
                  className="w-full p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/30 text-xs font-bold text-slate-700 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <span>Generate Invoice</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  onClick={() =>
                    showToast(
                      "Subscription Agreement Document downloaded",
                      "success",
                    )
                  }
                  className="w-full p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/30 text-xs font-bold text-slate-700 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <span>View Subscription Agreement</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Are you sure you want to cancel this subscription contract?",
                      )
                    ) {
                      try {
                        const res = await authenticatedFetch(
                          `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${subscription._id}`,
                          { method: "DELETE" },
                        );
                        if (res.ok) {
                          showToast("Subscription cancelled", "success");
                          navigate("/subscriptions");
                        }
                      } catch (e) {
                        showToast("Error cancelling subscription", "error");
                      }
                    }
                  }}
                  className="w-full p-3.5 rounded-xl border border-rose-100 hover:bg-rose-50 text-xs font-bold text-rose-600 flex items-center gap-3 transition-all cursor-pointer"
                >
                  <X className="h-4 w-4 text-rose-600" />
                  <span>Cancel Subscription</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal — rendered as a sibling of the page wrapper */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-sm font-extrabold text-slate-900">
                Record Subscription Payment
              </h3>
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={handleRecordPaymentSubmit}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 space-y-4 text-xs font-semibold text-slate-700 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold text-slate-450">
                      Currency *
                    </label>
                    <select
                      value={paymentCurrency}
                      onChange={(e) => setPaymentCurrency(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold bg-white"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.label}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold text-slate-450">
                      Amount ({getCurrencySymbol(paymentCurrency)}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                        {getCurrencySymbol(paymentCurrency)}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={totalAmount}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-450">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-450">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. INV-${new Date().getFullYear()}-0101`}
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-450">
                    Billing Period
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 25 May 2026 - 24 Jun 2026"
                    value={billingPeriodText}
                    onChange={(e) => setBillingPeriodText(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-450">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold bg-white"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="credit_debit_card">Credit/Debit Card</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-450">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold bg-white"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-450">
                    Reference / UTR / Transaction No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FT24015001 or UPI Ref"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPayment}
                  className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingPayment ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Add-on Service Modal — rendered as a sibling of the page wrapper */}
      {isAddServiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-sm font-extrabold text-slate-900">
                Add Service / Add-on
              </h3>
              <button
                onClick={() => setIsAddServiceOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={handleAddServiceSubmit}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 space-y-4 text-xs font-semibold text-slate-700 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-450">
                    Add-on Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SSL Certificate or Daily Backup"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold text-slate-450">
                      Currency *
                    </label>
                    <select
                      value={serviceCurrency}
                      onChange={(e) => setServiceCurrency(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold bg-white"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.label}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold text-slate-450">
                      Price ({getCurrencySymbol(serviceCurrency)}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                        {getCurrencySymbol(serviceCurrency)}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 500"
                        value={servicePrice}
                        onChange={(e) => setServicePrice(e.target.value)}
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-450">
                    Billing Cycle *
                  </label>
                  <select
                    value={serviceBillingCycle}
                    onChange={(e) => setServiceBillingCycle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-semibold bg-white"
                  >
                    <option value="monthly">Monthly (Recurring)</option>
                    <option value="one_time">One-Time (Billed Once)</option>
                  </select>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddServiceOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingService}
                  className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingService ? "Adding..." : "Add Add-on"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
