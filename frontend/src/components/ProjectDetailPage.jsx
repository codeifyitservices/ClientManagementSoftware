import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatWithINRConversion } from "../utils/currencyUtils";
import {
  ChevronLeft,
  ChevronDown,
  Calendar,
  IndianRupee,
  Layers,
  CheckCircle,
  FileCheck2,
  Clock,
  Eye,
  ExternalLink,
  Edit,
  Trash2,
  FileText,
  CreditCard,
  Users,
  Receipt,
  Percent,
  TrendingUp,
  DollarSign,
  Plus,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  PieChart,
  Save,
  Check,
  X,
  CalendarDays,
  CreditCard as PaymentIcon,
  Tag,
} from "lucide-react";

export default function ProjectDetailPage({
  token,
  invoices = [],
  onFetchInvoices,
  currentUser = null,
}) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [selectedMilestoneIdx, setSelectedMilestoneIdx] = useState(null);

  // Tab State: 'overview', 'expenses', 'commission', 'profitability'
  const [activeTab, setActiveTab] = useState("overview");

  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "Software / Tools",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paidBy: "Company Account",
    notes: "",
  });
  const [savingExpense, setSavingExpense] = useState(false);

  // Commission Form State
  const [commissionForm, setCommissionForm] = useState({
    enabled: false,
    type: "Percentage",
    basis: "Revenue",
    rate: 0,
    status: "Pending",
    paidDate: "",
    notes: "",
  });
  const [savingCommission, setSavingCommission] = useState(false);
  const [commissionSavedMsg, setCommissionSavedMsg] = useState("");

  // Fetch project details on mount
  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        if (data.milestones && data.milestones.length > 0) {
          setSelectedMilestoneIdx(0);
        }
        if (data.commission) {
          setCommissionForm({
            enabled: data.commission.enabled || false,
            type: data.commission.type || "Percentage",
            basis: data.commission.basis || "Revenue",
            rate: data.commission.rate || 0,
            status: data.commission.status || "Pending",
            paidDate: data.commission.paidDate ? new Date(data.commission.paidDate).toISOString().split("T")[0] : "",
            notes: data.commission.notes || "",
          });
        }
      } else {
        setError("Project not found.");
      }
    } catch (err) {
      setError("Error fetching project details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id, token]);

  useEffect(() => {
    if (showExpenseModal) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [showExpenseModal]);

  // Handle delete project
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project? This action is permanent.")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        navigate("/projects");
      } else {
        alert("Failed to delete project.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate invoice for selected milestone
  const handleGenerateInvoice = (milestoneIdx = selectedMilestoneIdx) => {
    if (milestoneIdx === null || !project || !project.milestones) return;
    const milestone = project.milestones[milestoneIdx];
    if (!milestone) return;

    const isPaid = milestone.status === "Paid" || (milestone.paidAmount !== undefined && milestone.paidAmount >= milestone.amount && milestone.amount > 0);
    if (isPaid) return;

    const invoiced = milestone.invoicedAmount !== undefined ? milestone.invoicedAmount : (milestone.invoice ? milestone.amount : 0);
    const remainingAmount = Math.max(0, milestone.amount - invoiced);
    if (remainingAmount <= 0) return;

    const amountToBill = remainingAmount > 0 ? remainingAmount : milestone.amount;

    const isForeign = project.client?.isForeign === true;
    const isPersonal = milestone.isPersonal === true || project.isPersonalAccount === true;
    const gstRate = (isForeign || isPersonal) ? 0 : 18;

    const isInclusive = milestone.isInclusive === true;
    let rate = amountToBill;
    if (isInclusive && gstRate > 0) {
      rate = Math.round(amountToBill / (1 + gstRate / 100));
    }

    const draftInvoice = {
      client: project.client?._id || project.client,
      currency: project.currency || "INR (₹)",
      dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      items: [
        {
          serviceName: milestone.service,
          description: invoiced > 0
            ? `${project.projectName} - ${milestone.name} (Part Payment)`
            : `${project.projectName} - ${milestone.name}`,
          sacCode: "998314",
          qty: 1,
          rate: rate,
          amount: rate,
          gstRate: gstRate,
          isInclusive: isInclusive && gstRate > 0,
          originalAmount: amountToBill,
        },
      ],
      projectId: project._id,
      milestoneId: milestone._id,
    };

    navigate("/invoices/create", { state: { draftInvoice } });
  };

  const handleViewInvoicePreview = async (invRef) => {
    if (!invRef) return;
    let targetInv = null;
    const invIdOrNum = typeof invRef === "object" ? (invRef._id || invRef.invoiceNumber) : invRef;

    if (typeof invRef === "object" && invRef.items && invRef.items.length > 0 && invRef.client) {
      targetInv = invRef;
    }

    if (!targetInv && invoices && invoices.length > 0) {
      targetInv = invoices.find((inv) => inv._id === invIdOrNum || inv.invoiceNumber === invIdOrNum);
    }

    if (!targetInv || !targetInv.items || targetInv.items.length === 0) {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/invoices/${invIdOrNum}`, {
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem("token")}`,
          },
        });
        if (res.ok) {
          targetInv = await res.json();
        }
      } catch (err) {
        console.error("Error fetching invoice for preview:", err);
      }
    }

    if (targetInv) {
      navigate("/invoices/preview", {
        state: {
          invoiceData: targetInv,
          readOnly: true,
          returnTo: `/projects/${project._id}`,
        },
      });
    } else {
      alert("Unable to load invoice preview.");
    }
  };

  // --- Expenses Actions ---
  const handleOpenExpenseModal = (expense = null) => {
    if (expense) {
      setEditingExpenseId(expense._id);
      setExpenseForm({
        title: expense.title,
        category: expense.category || "Software / Tools",
        amount: expense.amount,
        date: expense.date ? new Date(expense.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        paidBy: expense.paidBy || "Company Account",
        notes: expense.notes || "",
      });
    } else {
      setEditingExpenseId(null);
      setExpenseForm({
        title: "",
        category: "Software / Tools",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        paidBy: "Company Account",
        notes: "",
      });
    }
    setShowExpenseModal(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) {
      alert("Please enter title and amount.");
      return;
    }

    try {
      setSavingExpense(true);
      const url = editingExpenseId
        ? `${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}/expenses/${editingExpenseId}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}/expenses`;
      const method = editingExpenseId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
        body: JSON.stringify(expenseForm),
      });

      if (res.ok) {
        setShowExpenseModal(false);
        window.scrollTo({ top: 0, behavior: "instant" });
        await fetchProjectDetails();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to save expense.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving expense.");
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}/expenses/${expenseId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        await fetchProjectDetails();
      } else {
        alert("Failed to delete expense.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting expense.");
    }
  };

  // --- Commission Actions ---
  const handleSaveCommission = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingCommission(true);
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}/commission`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
        body: JSON.stringify(commissionForm),
      });

      if (res.ok) {
        await fetchProjectDetails();
        setCommissionSavedMsg("Commission settings saved successfully!");
        setTimeout(() => setCommissionSavedMsg(""), 3500);
      } else {
        const err = await res.json();
        alert(err.message || "Failed to save commission.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving commission.");
    } finally {
      setSavingCommission(false);
    }
  };

  const handleToggleCommissionStatus = async () => {
    const newStatus = commissionForm.status === "Paid" ? "Pending" : "Paid";
    const updated = {
      ...commissionForm,
      status: newStatus,
      paidDate: newStatus === "Paid" ? new Date().toISOString().split("T")[0] : "",
    };
    setCommissionForm(updated);

    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}/commission`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
        body: JSON.stringify(updated),
      });
      await fetchProjectDetails();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-semibold">Loading project details...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="py-24 text-center text-rose-500 font-bold">
        {error || "Project not found."}
      </div>
    );
  }

  // --- Financial Stats Aggregation ---
  const isForeignClient = project.client?.isForeign === true;
  const isPersonalAcc = project.isPersonalAccount === true;
  const hasGst = !isForeignClient && !isPersonalAcc;

  const projectValue = (project.finalAmount && project.finalAmount > 0)
    ? project.finalAmount
    : (project.projectValue || (project.milestones?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0));

  let totalBaseValue = projectValue;
  let totalTaxValue = 0;

  if (hasGst) {
    if (project.inclusiveGst !== false) {
      totalBaseValue = Math.round((projectValue / 1.18) * 100) / 100;
      totalTaxValue = Math.round((projectValue - totalBaseValue) * 100) / 100;
    } else {
      totalBaseValue = project.projectValue || Math.round((projectValue / 1.18) * 100) / 100;
      totalTaxValue = Math.round((totalBaseValue * 0.18) * 100) / 100;
    }
  }

  const projectInvoices = invoices.filter((inv) =>
    (inv.projectId && (inv.projectId?._id || inv.projectId)?.toString() === project._id?.toString()) ||
    project.milestones?.some((m) =>
      (m.invoices && m.invoices.some((mi) => (mi?._id || mi)?.toString() === inv._id?.toString())) ||
      (m.invoice?._id || m.invoice)?.toString() === inv._id?.toString()
    )
  );

  let received = 0;
  let invoicesCount = 0;
  let nextDueMilestone = null;

  project.milestones?.forEach((m) => {
    const paid = (m.status === "Paid")
      ? (m.amount || m.paidAmount || 0)
      : (m.paidAmount || 0);
    received += paid;
    if (paid < m.amount) {
      if (!nextDueMilestone || new Date(m.dueDate) < new Date(nextDueMilestone.dueDate)) {
        nextDueMilestone = m;
      }
    }
    const invList = m.invoices && m.invoices.length > 0 ? m.invoices : (m.invoice ? [m.invoice] : []);
    invoicesCount += invList.length;
  });

  if ((!project.milestones || project.milestones.length === 0) && projectInvoices.length > 0) {
    projectInvoices.forEach((inv) => {
      if (inv.paymentStatus === "Paid") {
        received += (inv.totalAmount || inv.amount || 0);
      }
    });
  }

  const outstanding = Math.max(0, projectValue - received);

  let baseReceived = received;
  let taxReceived = 0;
  if (hasGst && projectValue > 0) {
    baseReceived = Math.round((received / 1.18) * 100) / 100;
    taxReceived = Math.round((received - baseReceived) * 100) / 100;
  }

  const baseProgressPercent = totalBaseValue > 0 ? Math.min(100, Math.round((baseReceived / totalBaseValue) * 100)) : 0;
  const taxProgressPercent = (hasGst && totalTaxValue > 0) ? Math.min(100, Math.round((taxReceived / totalTaxValue) * 100)) : 0;

  // Expenses Aggregation
  const expensesList = project.expenses || [];
  const totalExpenses = expensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Profitability Calculations
  const operationalRevenue = received; 
  const grossProfit = operationalRevenue - totalExpenses;
  const grossMarginPercent = operationalRevenue > 0 ? ((grossProfit / operationalRevenue) * 100).toFixed(1) : 0;

  // Commission Calculation (Single Commission Option for Project)
  const comm = project.commission || commissionForm;
  let calculatedCommission = 0;
  if (comm.enabled && comm.rate > 0) {
    if (comm.type === "Fixed Amount") {
      calculatedCommission = Number(comm.rate) || 0;
    } else {
      if (comm.basis === "Profit") {
        calculatedCommission = Math.max(0, (grossProfit * (Number(comm.rate) || 0)) / 100);
      } else {
        calculatedCommission = (operationalRevenue * (Number(comm.rate) || 0)) / 100;
      }
    }
  }

  const netProfit = grossProfit - calculatedCommission;
  const netMarginPercent = operationalRevenue > 0 ? ((netProfit / operationalRevenue) * 100).toFixed(1) : 0;

  const getStatusBadgeClass = (status) => {
    if (status === "Completed") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    return "bg-blue-50 text-blue-700 border-blue-100";
  };

  const getMilestoneCircleColor = (status) => {
    if (status === "Paid") return "bg-emerald-500 text-white";
    if (status === "Partially Paid") return "bg-teal-500 text-white";
    if (status === "Invoiced") return "bg-indigo-500 text-white";
    if (status === "Partially Invoiced") return "bg-blue-500 text-white";
    return "bg-amber-500 text-white";
  };

  const getMilestoneStatusBadgeClass = (status) => {
    if (status === "Paid") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "Partially Paid") return "bg-teal-50 text-teal-700 border-teal-100";
    if (status === "Invoiced") return "bg-indigo-50 text-indigo-700 border-indigo-100";
    if (status === "Partially Invoiced") return "bg-blue-50 text-blue-700 border-blue-100";
    return "bg-amber-50 text-amber-700 border-amber-100";
  };

  // ── DEDICATED FULL-PAGE ADD / EDIT EXPENSE VIEW (IN NORMAL DOCUMENT FLOW, NO INNER SCROLLBAR) ──
  if (showExpenseModal) {
    const typedAmt = Number(expenseForm.amount) || 0;
    const existingAmt = editingExpenseId
      ? Number(project.expenses?.find((e) => e._id === editingExpenseId)?.amount) || 0
      : 0;
    const newTotalExpenses = Math.max(0, totalExpenses - existingAmt + typedAmt);
    const newGrossProfit = operationalRevenue - newTotalExpenses;

    let newCommission = 0;
    if (comm.enabled && comm.rate > 0) {
      if (comm.type === "Fixed Amount") {
        newCommission = Number(comm.rate) || 0;
      } else {
        if (comm.basis === "Profit") {
          newCommission = Math.max(0, (newGrossProfit * (Number(comm.rate) || 0)) / 100);
        } else {
          newCommission = (operationalRevenue * (Number(comm.rate) || 0)) / 100;
        }
      }
    }
    const newNetProfit = newGrossProfit - newCommission;
    const newNetMargin = operationalRevenue > 0 ? ((newNetProfit / operationalRevenue) * 100).toFixed(1) : 0;

    return (
      <div className="space-y-6 font-sans select-none animate-fade-in pb-16">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                setShowExpenseModal(false);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer bg-white shadow-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Project</span>
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  {editingExpenseId ? "Edit Project Expense" : "Add Project Expense"}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-[#5D5FEF]">
                  {project.projectName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                ID: {project.projectId} &bull; Record direct operational costs to track project profit margins
              </p>
            </div>
          </div>

          {/* Top Action CTAs */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setShowExpenseModal(false);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 bg-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveExpense}
              disabled={savingExpense}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#5D5FEF] hover:bg-[#4d4fdf] shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              {savingExpense ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>{editingExpenseId ? "Update Expense" : "Save Expense"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form Body: 2 Columns */}
        <form onSubmit={handleSaveExpense}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── LEFT COLUMN (lg:col-span-8): Form Cards ── */}
            <div className="lg:col-span-8 space-y-6">
              {/* Card 1: Basic Information */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#5D5FEF] flex items-center justify-center font-bold text-xs">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">General Expense Details</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Specify the expense title, category, and date incurred.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Expense Title */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Expense Title / Purpose <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={expenseForm.title}
                      onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-slate-50/40 focus:bg-white focus:border-[#5D5FEF] focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                      placeholder="e.g. AWS Cloud Hosting, Domain & SSL, Freelance UI Designer, Figma Org License"
                    />

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Quick Select:</span>
                      {["AWS Hosting", "Domain / SSL", "Contractor Payout", "Figma License", "Meta Ads", "Asset Purchase", "API Subscription"].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setExpenseForm({ ...expenseForm, title: chip })}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-[#5D5FEF] text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2-Column: Category & Expense Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                    {/* Category */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Expense Category <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={expenseForm.category}
                          onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/40 focus:bg-white focus:border-[#5D5FEF] focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none appearance-none cursor-pointer"
                        >
                          <option value="Software / Tools">Software / Tools</option>
                          <option value="Server / Hosting">Server / Hosting</option>
                          <option value="Subcontractor / Freelancer">Subcontractor / Freelancer</option>
                          <option value="Marketing / Ads">Marketing / Ads</option>
                          <option value="Travel / Logistics">Travel / Logistics</option>
                          <option value="Assets / Design">Assets / Design</option>
                          <option value="Other">Other</option>
                        </select>
                        <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Expense Date */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Date Incurred <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/40 focus:bg-white focus:border-[#5D5FEF] focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Financials & Payment Account */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    <IndianRupee className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Financial Amount & Payment Source</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Record the exact expense sum and which account was used.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Amount <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50/40 focus-within:bg-white focus-within:border-[#5D5FEF] focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all overflow-hidden h-11">
                      <span className="inline-flex items-center px-3.5 bg-slate-100/80 border-r border-slate-200 text-xs font-bold text-slate-600 select-none whitespace-nowrap">
                        {project.currency || "₹"}
                      </span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        className="w-full px-3.5 bg-transparent text-sm font-black text-slate-900 placeholder-slate-400 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Paid By Account */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Paid By / Payment Method
                    </label>
                    <input
                      type="text"
                      value={expenseForm.paidBy}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-slate-50/40 focus:bg-white focus:border-[#5D5FEF] focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                      placeholder="e.g. Company Bank Account, Corporate Card, Director Account"
                    />

                    {/* Quick suggestions for Paid By */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {["Company Account", "Corporate Card", "Director Account", "Petty Cash"].map((acc) => (
                        <button
                          key={acc}
                          type="button"
                          onClick={() => setExpenseForm({ ...expenseForm, paidBy: acc })}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer"
                        >
                          {acc}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Notes & Documentation */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Notes & Reference Documentation</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Add invoice reference number, vendor information, or receipt links.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Additional Notes / Receipt URL / Remarks <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows="4"
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="w-full p-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 bg-slate-50/40 focus:bg-white focus:border-[#5D5FEF] focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none resize-none"
                    placeholder="Enter vendor name, invoice reference #, Google Drive receipt link, or internal accounting remarks..."
                  />
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between pt-4 pb-12">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseModal(false);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 border border-slate-200 bg-white transition-colors cursor-pointer"
                >
                  Cancel & Discard
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingExpense}
                    className="px-8 py-2.5 rounded-xl text-xs font-bold text-white bg-[#5D5FEF] hover:bg-[#4d4fdf] shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {savingExpense ? (
                      <span>Saving Expense...</span>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>{editingExpenseId ? "Update Expense Record" : "Confirm & Save Expense"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN (lg:col-span-4): Live Financial Impact & Guidelines ── */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
              {/* Live Profitability Impact Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-950 relative overflow-hidden space-y-4">
                {/* Gradient lighting effect */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(93,95,239,0.2),transparent_70%)] pointer-events-none" />

                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#5D5FEF]" />
                    <span>Live Profitability Impact</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    Realtime
                  </span>
                </div>

                {/* Revenue & Total Cost comparison */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400 font-medium">Collected Revenue</span>
                    <span className="font-bold text-white">
                      {formatWithINRConversion(operationalRevenue, project.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400 font-medium">Total Project Expenses</span>
                    <div className="text-right">
                      <span className="font-black text-rose-400">
                        {formatWithINRConversion(newTotalExpenses, project.currency)}
                      </span>
                      {typedAmt > 0 && (
                        <span className="block text-[10px] text-rose-300">
                          (+{formatWithINRConversion(typedAmt - existingAmt, project.currency)})
                        </span>
                      )}
                    </div>
                  </div>

                  {comm.enabled && (
                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                      <span className="text-slate-400 font-medium">Sales Commission</span>
                      <span className="font-bold text-purple-300">
                        - {formatWithINRConversion(newCommission, project.currency)}
                      </span>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Projected Net Profit
                      </span>
                      <span className={`text-sm font-black ${newNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {formatWithINRConversion(newNetProfit, project.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-400 font-medium">Projected Margin</span>
                      <span className={`font-black ${newNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {newNetMargin}% Net Margin
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden flex">
                    {newTotalExpenses > 0 && operationalRevenue > 0 && (
                      <div
                        style={{ width: `${Math.min(100, (newTotalExpenses / operationalRevenue) * 100)}%` }}
                        className="bg-rose-400 h-full transition-all duration-300"
                      />
                    )}
                    {newNetProfit > 0 && operationalRevenue > 0 && (
                      <div
                        style={{ width: `${Math.min(100, (newNetProfit / operationalRevenue) * 100)}%` }}
                        className="bg-emerald-400 h-full transition-all duration-300"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Cost: {operationalRevenue > 0 ? ((newTotalExpenses / operationalRevenue) * 100).toFixed(0) : 0}%</span>
                    <span>Retained: {newNetMargin}%</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans select-none animate-fade-in pb-16">
      {/* Top Header Actions Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/projects")}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </button>

        {/* Actions Dropdown */}
        {currentUser?.role !== "Employee" && (
          <div className="relative">
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span>Actions</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showActionsDropdown ? "rotate-180" : ""}`} />
            </button>

            {showActionsDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionsDropdown(false)} />
                <div className="absolute right-0 mt-1.5 w-36 bg-white border border-slate-150 rounded-xl shadow-lg py-1.5 z-50 text-left">
                  <button
                    onClick={() => {
                      setShowActionsDropdown(false);
                      navigate(`/projects/${id}/edit`, { state: { project } });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-[11px] font-bold text-slate-650 transition-colors cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5 text-slate-400" />
                    <span>Edit Project</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowActionsDropdown(false);
                      handleDelete();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-[11px] font-bold text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Project</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Container Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow space-y-6">
        {/* Project Meta and Date Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-slate-100 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                {project.projectName}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(project.status)}`}>
                {project.status}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              {project.projectId} &nbsp;|&nbsp; Client: <span className="text-slate-700 font-bold">{project.client?.companyName}</span>
            </p>
          </div>

          <div className="text-xs text-slate-500 font-semibold flex items-center gap-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100 self-start md:self-auto">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Start Date</span>
              <p className="text-slate-700 font-bold">{new Date(project.startDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Expected End</span>
              <p className="text-slate-700 font-bold">{new Date(project.expectedEndDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Project Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-[#5D5FEF] text-white shadow-sm shadow-indigo-500/20"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Overview & Milestones</span>
          </button>

          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "expenses"
                ? "bg-[#5D5FEF] text-white shadow-sm shadow-indigo-500/20"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Expenses</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
              activeTab === "expenses" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {expensesList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("commission")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "commission"
                ? "bg-[#5D5FEF] text-white shadow-sm shadow-indigo-500/20"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
            }`}
          >
            <Percent className="h-3.5 w-3.5" />
            <span>Commission</span>
            {comm.enabled && (
              <span className={`w-2 h-2 rounded-full ${
                comm.status === "Paid" ? "bg-emerald-400" : "bg-amber-400"
              }`} />
            )}
          </button>

          <button
            onClick={() => setActiveTab("profitability")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "profitability"
                ? "bg-[#5D5FEF] text-white shadow-sm shadow-indigo-500/20"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Profitability & Financials</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
              netProfit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}>
              {netMarginPercent}%
            </span>
          </button>
        </div>

        {/* ── TAB 1: OVERVIEW & MILESTONES ── */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* Financial Metrics Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Project Value</span>
                <h4 className="text-lg font-black text-slate-900 mt-1">{formatWithINRConversion(projectValue, project.currency)}</h4>
                {project.isPersonalAccount && (
                  <span className="text-[8px] text-amber-500 font-bold uppercase select-none block mt-0.5">(Personal)</span>
                )}
                {project.client?.isForeign && (
                  <span className="text-[8px] text-emerald-500 font-bold uppercase select-none block mt-0.5">(Foreign)</span>
                )}
                {!project.isPersonalAccount && !project.client?.isForeign && project.projectValue !== undefined && (
                  <span className="text-[8px] text-indigo-500 font-bold uppercase select-none block mt-0.5">
                    ({project.inclusiveGst ? "Inclusive" : "Exclusive"} GST)
                  </span>
                )}
              </div>

              <div className="p-4 bg-emerald-50/25 border border-emerald-100/60 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Received</span>
                <h4 className="text-lg font-black text-emerald-600 mt-1">{formatWithINRConversion(received, project.currency)}</h4>
              </div>

              <div className="p-4 bg-rose-50/25 border border-rose-100/60 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500">Outstanding</span>
                <h4 className="text-lg font-black text-rose-600 mt-1">{formatWithINRConversion(outstanding, project.currency)}</h4>
              </div>

              <div className="p-4 bg-indigo-50/25 border border-indigo-100/60 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">Invoices</span>
                <h4 className="text-lg font-black text-indigo-600 mt-1">{invoicesCount}</h4>
              </div>

              <div className="p-4 bg-amber-50/25 border border-amber-100/60 rounded-xl col-span-2 md:col-span-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Next Due</span>
                {nextDueMilestone ? (
                  <div className="mt-0.5">
                    <h4 className="text-sm font-black text-slate-900">{formatWithINRConversion(nextDueMilestone.amount, project.currency)}</h4>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Due {new Date(nextDueMilestone.dueDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</p>
                  </div>
                ) : (
                  <h4 className="text-xs font-bold text-slate-400 mt-1">No due items</h4>
                )}
              </div>
            </div>

            {/* 2 Payment Progress Bars: Base Amount & Tax */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    Base Amount Progress (Excl. GST)
                  </span>
                  <span className="text-emerald-600 font-extrabold text-xs">{baseProgressPercent}%</span>
                </div>
                <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${baseProgressPercent}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-600 font-bold flex items-center justify-between pt-0.5">
                  <span>{formatWithINRConversion(baseReceived, project.currency)} received</span>
                  <span className="text-slate-400 font-medium">of {formatWithINRConversion(totalBaseValue, project.currency)}</span>
                </div>
              </div>

              <div className="bg-slate-50/70 border border-slate-100 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                    Tax (GST 18%) Progress
                  </span>
                  <span className="text-indigo-600 font-extrabold text-xs">
                    {hasGst ? `${taxProgressPercent}%` : "0% (No Tax)"}
                  </span>
                </div>
                <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${hasGst ? taxProgressPercent : 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-600 font-bold flex items-center justify-between pt-0.5">
                  {hasGst ? (
                    <>
                      <span>{formatWithINRConversion(taxReceived, project.currency)} tax received</span>
                      <span className="text-slate-400 font-medium">of {formatWithINRConversion(totalTaxValue, project.currency)}</span>
                    </>
                  ) : (
                    <span className="text-slate-400 font-medium italic">No Tax applicable (Personal / Foreign Account)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Milestones Table */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <span>Payment Milestones / Installments</span>
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3 pl-4 w-52">Milestone</th>
                      <th className="py-3 w-40 text-right">Amount</th>
                      <th className="py-3 w-44 pl-12">Due Date</th>
                      <th className="py-3 w-32 text-center">Status</th>
                      <th className="py-3 w-40 text-center">Invoice</th>
                      <th className="py-3 w-20 text-center pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {project.milestones?.map((m, idx) => {
                      const isSelected = selectedMilestoneIdx === idx;
                      const linkedInvoices = m.invoices && m.invoices.length > 0 ? m.invoices : (m.invoice ? [m.invoice] : []);
                      const isPaid = m.status === "Paid" || (m.paidAmount !== undefined && m.paidAmount >= m.amount && m.amount > 0);
                      const invoiced = m.invoicedAmount !== undefined ? m.invoicedAmount : (m.invoice ? m.amount : 0);
                      const remaining = Math.max(0, m.amount - invoiced);
                      const canGenerate = currentUser?.role !== "Employee" && !isPaid && remaining > 0;

                      return (
                        <tr
                          key={m._id || idx}
                          onClick={() => setSelectedMilestoneIdx(idx)}
                          className={`hover:bg-slate-50/50 cursor-pointer transition-colors font-semibold ${
                            isSelected ? "bg-indigo-50/30" : ""
                          }`}
                        >
                          <td className="py-3.5 pl-4 flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${getMilestoneCircleColor(m.status)}`}>
                              {idx + 1}
                            </span>
                            <div>
                              <span className="text-slate-800 font-bold truncate max-w-[180px] block">{m.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{m.service}</span>
                            </div>
                          </td>
                          <td className="py-3.5 text-right whitespace-nowrap">
                            <div className="font-black text-slate-900">
                              {formatWithINRConversion(m.amount, project.currency)}
                            </div>
                            {!isPaid && invoiced > 0 && remaining > 0 && (
                              <span className="text-[10px] font-medium text-amber-600 block">
                                Rem: {formatWithINRConversion(remaining, project.currency)}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 pl-12 text-slate-500">
                            {m.dueDate ? new Date(m.dueDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getMilestoneStatusBadgeClass(m.status)}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            {linkedInvoices.length > 0 ? (
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {linkedInvoices.map((inv, invIdx) => {
                                  const invNum = inv?.invoiceNumber || (typeof inv === "string" ? inv : `INV-${invIdx + 1}`);
                                  return (
                                    <span
                                      key={inv?._id || invIdx}
                                      onClick={() => handleViewInvoicePreview(inv)}
                                      className="text-[#5D5FEF] font-bold text-[10px] hover:underline cursor-pointer inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50/70 border border-indigo-100"
                                      title="Click to preview invoice"
                                    >
                                      <span>{invNum}</span>
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px] font-medium">-</span>
                            )}
                          </td>
                          <td className="py-3.5 text-center pr-4" onClick={(e) => e.stopPropagation()}>
                            {canGenerate ? (
                              <button
                                onClick={() => handleGenerateInvoice(idx)}
                                className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-sm shadow-indigo-500/5 inline-flex items-center gap-1"
                                title={invoiced > 0 ? "Generate Part Invoice" : "Generate Invoice"}
                              >
                                <FileText className="h-3 w-3" />
                                <span>{invoiced > 0 ? "+ Part Inv" : "Generate"}</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[10px] font-medium">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Project Invoices Section */}
            {projectInvoices.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <span>Project Invoices ({projectInvoices.length})</span>
                  </h3>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="py-3 pl-4">Invoice No.</th>
                        <th className="py-3">Invoice Date</th>
                        <th className="py-3 text-right">Amount</th>
                        <th className="py-3 text-center">Status</th>
                        <th className="py-3 text-center pr-4 w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                      {projectInvoices.map((inv) => (
                        <tr
                          key={inv._id}
                          onClick={() => handleViewInvoicePreview(inv._id || inv)}
                          className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 pl-4 font-bold text-[#5D5FEF]">{inv.invoiceNumber}</td>
                          <td className="py-3.5 text-slate-550">
                            {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 text-right font-black text-slate-900 whitespace-nowrap">
                            {formatWithINRConversion(inv.totalAmount, inv.currency)}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              inv.paymentStatus === "Paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {inv.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3.5 text-center pr-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleViewInvoicePreview(inv._id)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="View Invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Assigned Team Members Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-indigo-600" />
                <span>Assigned Team Members ({project.assignedEmployees?.length || 0})</span>
              </h3>
              
              {(!project.assignedEmployees || project.assignedEmployees.length === 0) ? (
                <p className="text-[11px] text-slate-400 font-semibold py-2">No team members assigned to this project yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {project.assignedEmployees.map((emp) => (
                    <div key={emp._id} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center font-black text-xs">
                        {emp.fullName?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate leading-none">{emp.fullName}</p>
                        <span className="text-[9px] text-slate-400 block mt-1 font-semibold truncate">
                          {emp.designation} &bull; {emp.department}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-semibold truncate">
                          {emp.companyEmail}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: EXPENSES ── */}
        {activeTab === "expenses" && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Expenses Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-rose-50/20 border border-rose-100/60 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                  <Receipt className="h-3 w-3" />
                  Total Incurred Expenses
                </span>
                <h4 className="text-xl font-black text-rose-600 mt-1">
                  {formatWithINRConversion(totalExpenses, project.currency)}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Direct costs logged against project
                </p>
              </div>

              <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Expense Items
                </span>
                <h4 className="text-xl font-black text-slate-900 mt-1">
                  {expensesList.length}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Recorded transactions
                </p>
              </div>

              <div className="p-4 bg-indigo-50/20 border border-indigo-100/60 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">
                  Expense / Revenue Ratio
                </span>
                <h4 className="text-xl font-black text-indigo-600 mt-1">
                  {operationalRevenue > 0 ? `${((totalExpenses / operationalRevenue) * 100).toFixed(1)}%` : "0%"}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Percentage of collected revenue spent
                </p>
              </div>
            </div>

            {/* Header with Add Expense Button */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-rose-500" />
                  <span>Project Expenses Log</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Track servers, software licenses, freelance contractors, and asset purchases for this project.
                </p>
              </div>

              {currentUser?.role !== "Employee" && (
                <button
                  onClick={() => handleOpenExpenseModal()}
                  className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm inline-flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Expense</span>
                </button>
              )}
            </div>

            {/* Expenses Table */}
            {expensesList.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/40 space-y-3">
                <Receipt className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No expenses recorded for this project yet.</p>
                <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto">
                  Keep track of direct operational costs to accurately compute net profitability.
                </p>
                {currentUser?.role !== "Employee" && (
                  <button
                    onClick={() => handleOpenExpenseModal()}
                    className="mt-2 text-xs font-bold text-[#5D5FEF] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Log First Expense</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3 pl-4">Title / Description</th>
                      <th className="py-3">Category</th>
                      <th className="py-3">Date</th>
                      <th className="py-3">Paid By</th>
                      <th className="py-3 text-right">Amount</th>
                      {currentUser?.role !== "Employee" && (
                        <th className="py-3 text-center pr-4 w-20">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                    {expensesList.map((exp) => (
                      <tr key={exp._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 pl-4">
                          <p className="font-bold text-slate-900 leading-tight">{exp.title}</p>
                          {exp.notes && (
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">{exp.notes}</p>
                          )}
                        </td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                            {exp.category || "Other"}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-500">
                          {new Date(exp.date || exp.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 text-slate-600">
                          {exp.paidBy || "Company Account"}
                        </td>
                        <td className="py-3.5 text-right font-black text-rose-600 whitespace-nowrap">
                          {formatWithINRConversion(exp.amount, project.currency)}
                        </td>
                        {currentUser?.role !== "Employee" && (
                          <td className="py-3.5 text-center pr-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenExpenseModal(exp)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="Edit Expense"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp._id)}
                                className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 cursor-pointer"
                                title="Delete Expense"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: COMMISSIONS ── */}
        {activeTab === "commission" && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Commission Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-purple-50/25 border border-purple-100/60 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Calculated Commission
                </span>
                <h4 className="text-xl font-black text-purple-700 mt-1">
                  {formatWithINRConversion(calculatedCommission, project.currency)}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  {comm.enabled
                    ? `${comm.type === "Percentage" ? `${comm.rate}% on ${comm.basis}` : `Fixed ${formatWithINRConversion(comm.rate, project.currency)}`}`
                    : "No active commission rule"}
                </p>
              </div>

              <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Payout Status
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                    comm.status === "Paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  }`}>
                    {comm.status || "Pending"}
                  </span>
                  {currentUser?.role !== "Employee" && comm.enabled && (
                    <button
                      onClick={handleToggleCommissionStatus}
                      className="text-[10px] font-bold text-[#5D5FEF] hover:underline cursor-pointer"
                    >
                      (Switch to {comm.status === "Paid" ? "Pending" : "Paid"})
                    </button>
                  )}
                </div>
                {comm.paidDate && (
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    Paid on {new Date(comm.paidDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-xl">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Effective Cost Impact
                </span>
                <h4 className="text-xl font-black text-slate-800 mt-1">
                  {operationalRevenue > 0 ? `${((calculatedCommission / operationalRevenue) * 100).toFixed(1)}%` : "0%"}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Of collected revenue allocated to commission
                </p>
              </div>
            </div>

            {/* Commission Settings Form Card */}
            <div className="border border-slate-150 rounded-2xl p-5 bg-white space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Percent className="h-4 w-4 text-purple-600" />
                    <span>Project Commission Configuration</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Configure a single commission rule for this project based on either Revenue or Gross Profit.
                  </p>
                </div>

                {commissionSavedMsg && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 animate-fade-in">
                    <Check className="h-3.5 w-3.5" />
                    {commissionSavedMsg}
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveCommission} className="space-y-4">
                {/* Toggle Enable */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block cursor-pointer">
                      Enable Commission for this Project
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      When enabled, commission will be automatically computed and deducted from gross profit.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={commissionForm.enabled}
                    onChange={(e) => setCommissionForm({ ...commissionForm, enabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-[#5D5FEF]"
                    disabled={currentUser?.role === "Employee"}
                  />
                </div>

                {commissionForm.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    {/* Commission Type */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Commission Type
                      </label>
                      <select
                        value={commissionForm.type}
                        onChange={(e) => setCommissionForm({ ...commissionForm, type: e.target.value })}
                        disabled={currentUser?.role === "Employee"}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        <option value="Percentage">Percentage (%)</option>
                        <option value="Fixed Amount">Fixed Amount ({project.currency || "₹"})</option>
                      </select>
                    </div>

                    {/* Commission Basis (Revenue vs Profit) - Only applicable if Percentage */}
                    {commissionForm.type === "Percentage" ? (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Commission Basis
                        </label>
                        <select
                          value={commissionForm.basis}
                          onChange={(e) => setCommissionForm({ ...commissionForm, basis: e.target.value })}
                          disabled={currentUser?.role === "Employee"}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          <option value="Revenue">On Total Revenue (Collected)</option>
                          <option value="Profit">On Gross Profit (Revenue - Expenses)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Calculation Basis
                        </label>
                        <input
                          type="text"
                          disabled
                          value="Flat Project Fee"
                          className="w-full px-3 py-2 border border-slate-100 rounded-xl text-xs font-semibold bg-slate-50 text-slate-400"
                        />
                      </div>
                    )}

                    {/* Rate / Amount */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {commissionForm.type === "Percentage" ? "Commission Rate (%)" : `Fixed Amount (${project.currency || "₹"})`}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step={commissionForm.type === "Percentage" ? "0.1" : "1"}
                        value={commissionForm.rate}
                        onChange={(e) => setCommissionForm({ ...commissionForm, rate: e.target.value })}
                        disabled={currentUser?.role === "Employee"}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        placeholder={commissionForm.type === "Percentage" ? "e.g. 10" : "e.g. 5000"}
                      />
                    </div>

                    {/* Payout Status */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Payout Status
                      </label>
                      <select
                        value={commissionForm.status}
                        onChange={(e) => setCommissionForm({
                          ...commissionForm,
                          status: e.target.value,
                          paidDate: e.target.value === "Paid" ? new Date().toISOString().split("T")[0] : "",
                        })}
                        disabled={currentUser?.role === "Employee"}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        <option value="Pending">Pending Payout</option>
                        <option value="Paid">Fully Paid</option>
                      </select>
                    </div>

                    {/* Paid Date (if Paid) */}
                    {commissionForm.status === "Paid" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Disbursement Date
                        </label>
                        <input
                          type="date"
                          value={commissionForm.paidDate}
                          onChange={(e) => setCommissionForm({ ...commissionForm, paidDate: e.target.value })}
                          disabled={currentUser?.role === "Employee"}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1 md:col-span-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Notes / Payout Reference
                      </label>
                      <input
                        type="text"
                        value={commissionForm.notes}
                        onChange={(e) => setCommissionForm({ ...commissionForm, notes: e.target.value })}
                        disabled={currentUser?.role === "Employee"}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        placeholder="e.g. 10% sales referral for Q1 lead generation"
                      />
                    </div>
                  </div>
                )}

                {/* Save Button */}
                {currentUser?.role !== "Employee" && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingCommission}
                      className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{savingCommission ? "Saving..." : "Save Commission Rule"}</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ── TAB 4: PROFITABILITY & FINANCIALS ── */}
        {activeTab === "profitability" && (
          <div className="space-y-6 animate-fade-in pt-1">
            {/* 1. Main Profitability Summary Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Net Retained Profit
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      netProfit >= 0
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>{netMarginPercent}% Net Margin</span>
                    </span>
                  </div>
                  <h3 className={`text-3xl font-extrabold tracking-tight mt-1.5 ${
                    netProfit >= 0 ? "text-slate-900" : "text-rose-600"
                  }`}>
                    {formatWithINRConversion(netProfit, project.currency)}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Actual profit retained after all direct project costs and sales commissions.
                  </p>
                </div>

                {/* Quick financial breakdown metric chips */}
                <div className="flex items-center gap-4 sm:border-l sm:border-slate-100 sm:pl-6 self-start sm:self-auto">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Margin</span>
                    <p className="text-sm font-extrabold text-slate-800">{grossMarginPercent}%</p>
                  </div>
                  <div className="h-8 w-px bg-slate-100 hidden sm:block" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expense Ratio</span>
                    <p className="text-sm font-extrabold text-slate-800">
                      {operationalRevenue > 0 ? `${((totalExpenses / operationalRevenue) * 100).toFixed(1)}%` : "0%"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Secondary Metric Tiles (Clean, Calm, Uniform) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Collected Revenue */}
                <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    1. Collected Revenue
                  </span>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {formatWithINRConversion(operationalRevenue, project.currency)}
                  </p>
                  <span className="text-[11px] text-slate-400 font-medium">Total received payments</span>
                </div>

                {/* 2. Direct Expenses */}
                <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    2. Direct Expenses
                  </span>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {formatWithINRConversion(totalExpenses, project.currency)}
                  </p>
                  <span className="text-[11px] text-slate-400 font-medium">{expensesList.length} logged expense items</span>
                </div>

                {/* 3. Sales Commission */}
                <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    3. Sales Commission
                  </span>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {formatWithINRConversion(calculatedCommission, project.currency)}
                  </p>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {comm.enabled ? `${comm.type === "Percentage" ? `${comm.rate}% on ${comm.basis}` : `Fixed rule`}` : "None configured"}
                  </span>
                </div>
              </div>

              {/* Minimal Revenue Allocation Bar */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Revenue Allocation</span>
                  <span>100% Invoiced Revenue</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                  {totalExpenses > 0 && operationalRevenue > 0 && (
                    <div
                      style={{ width: `${Math.min(100, (totalExpenses / operationalRevenue) * 100)}%` }}
                      className="bg-rose-400 h-full"
                      title={`Expenses: ${formatWithINRConversion(totalExpenses, project.currency)}`}
                    />
                  )}
                  {calculatedCommission > 0 && operationalRevenue > 0 && (
                    <div
                      style={{ width: `${Math.min(100, (calculatedCommission / operationalRevenue) * 100)}%` }}
                      className="bg-purple-400 h-full"
                      title={`Commission: ${formatWithINRConversion(calculatedCommission, project.currency)}`}
                    />
                  )}
                  {netProfit > 0 && operationalRevenue > 0 && (
                    <div
                      style={{ width: `${Math.min(100, (netProfit / operationalRevenue) * 100)}%` }}
                      className="bg-emerald-500 h-full"
                      title={`Net Profit: ${formatWithINRConversion(netProfit, project.currency)}`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-medium pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    Direct Expenses ({operationalRevenue > 0 ? ((totalExpenses / operationalRevenue) * 100).toFixed(1) : 0}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    Commission ({operationalRevenue > 0 ? ((calculatedCommission / operationalRevenue) * 100).toFixed(1) : 0}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Retained Net Profit ({netMarginPercent}%)
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Structured Financial Statement (P&L Ledger) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Project Financial Statement</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Clear breakdown of gross revenue, operational deductions, and final net profit.</p>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-md">
                  P&amp;L Ledger
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 pr-4">Item</th>
                      <th className="py-2.5 px-4">Calculation Basis</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                      <th className="py-2.5 pl-4 text-right">% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {/* Gross Revenue */}
                    <tr>
                      <td className="py-3.5 pr-4 font-bold text-slate-900">
                        1. Gross Collected Revenue
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        Total received milestone payments
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatWithINRConversion(operationalRevenue, project.currency)}
                      </td>
                      <td className="py-3.5 pl-4 text-right text-slate-500">100.0%</td>
                    </tr>

                    {/* Direct Expenses */}
                    <tr>
                      <td className="py-3.5 pr-4 text-slate-700">
                        2. Less: Direct Expenses
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        Hosting, tools, contractor costs ({expensesList.length} items)
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                        - {formatWithINRConversion(totalExpenses, project.currency)}
                      </td>
                      <td className="py-3.5 pl-4 text-right text-slate-500">
                        {operationalRevenue > 0 ? `${((totalExpenses / operationalRevenue) * 100).toFixed(1)}%` : "0%"}
                      </td>
                    </tr>

                    {/* Gross Operating Profit */}
                    <tr className="bg-slate-50/70 font-bold text-slate-900">
                      <td className="py-3 pr-4">
                        = Gross Operating Profit
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-normal text-[11px]">
                        Revenue minus Direct Expenses
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {formatWithINRConversion(grossProfit, project.currency)}
                      </td>
                      <td className="py-3 pl-4 text-right text-slate-700">{grossMarginPercent}%</td>
                    </tr>

                    {/* Sales Commission */}
                    <tr>
                      <td className="py-3.5 pr-4 text-slate-700">
                        3. Less: Sales / Partner Commission
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {comm.enabled
                          ? `${comm.type === "Percentage" ? `${comm.rate}% on ${comm.basis}` : `Fixed ${formatWithINRConversion(comm.rate, project.currency)}`}`
                          : "No commission configured"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                        - {formatWithINRConversion(calculatedCommission, project.currency)}
                      </td>
                      <td className="py-3.5 pl-4 text-right text-slate-500">
                        {operationalRevenue > 0 ? `${((calculatedCommission / operationalRevenue) * 100).toFixed(1)}%` : "0%"}
                      </td>
                    </tr>

                    {/* Final Net Retained Profit */}
                    <tr className="border-t-2 border-slate-200 font-bold bg-slate-50/40">
                      <td className="py-4 pr-4 text-slate-900 text-sm font-extrabold flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span>= Net Final Project Profit</span>
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium text-[11px]">
                        Bottom-line retained earnings
                      </td>
                      <td className={`py-4 px-4 text-right text-base font-extrabold ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatWithINRConversion(netProfit, project.currency)}
                      </td>
                      <td className="py-4 pl-4 text-right text-slate-900 font-extrabold text-sm">{netMarginPercent}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

