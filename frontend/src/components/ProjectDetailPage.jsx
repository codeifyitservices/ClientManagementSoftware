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
  Users
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
        // Automatically select the first milestone if available
        if (data.milestones && data.milestones.length > 0) {
          setSelectedMilestoneIdx(0);
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
  const handleGenerateInvoice = () => {
    if (selectedMilestoneIdx === null || !project) return;
    const milestone = project.milestones[selectedMilestoneIdx];
    if (milestone.status !== "Pending") return;

    const isForeign = project.client?.isForeign === true;
    const isPersonal = milestone.isPersonal === true;
    const gstRate = (isForeign || isPersonal) ? 0 : 18;

    const isInclusive = milestone.isInclusive === true;
    let rate = milestone.amount;
    if (isInclusive && gstRate > 0) {
      rate = Math.round(milestone.amount / (1 + gstRate / 100));
    }

    const draftInvoice = {
      client: project.client?._id || project.client,
      currency: project.currency || "INR (₹)",
      dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      items: [
        {
          serviceName: milestone.service,
          description: milestone.name,
          sacCode: "998314",
          qty: 1,
          rate: rate,
          amount: rate,
          gstRate: gstRate,
          isInclusive: isInclusive && gstRate > 0,
          originalAmount: milestone.amount,
        },
      ],
      projectId: project._id,
      milestoneId: milestone._id,
    };

    navigate("/invoices/create", { state: { draftInvoice } });
  };

  // Record payment for selected milestone's invoice
  const handleRecordPayment = async () => {
    if (selectedMilestoneIdx === null || !project) return;
    const milestone = project.milestones[selectedMilestoneIdx];
    const invoiceId = milestone.invoice?._id || milestone.invoice;
    if (!invoiceId) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/invoices/${invoiceId}/mark-paid`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem("token")}`,
          },
        }
      );
      if (res.ok) {
        await fetchProjectDetails();
        if (onFetchInvoices) onFetchInvoices();
      } else {
        alert("Failed to record payment.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewInvoicePreview = (invoiceId) => {
    const fullInvoice = invoices.find((inv) => inv._id === invoiceId);
    if (fullInvoice) {
      navigate("/invoices/preview", {
        state: {
          invoiceData: fullInvoice,
          returnTo: `/projects/${project._id}`,
        },
      });
    } else {
      navigate(`/invoices/${invoiceId}/edit`);
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

  // Calculate project financial stats & 2-Progress Bar Breakdown (Base Amount vs Tax)
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

  let received = 0;
  let invoicesCount = 0;
  let nextDueMilestone = null;

  project.milestones?.forEach((m) => {
    if (m.status === "Paid") {
      received += m.amount || 0;
    } else {
      if (!nextDueMilestone || new Date(m.dueDate) < new Date(nextDueMilestone.dueDate)) {
        nextDueMilestone = m;
      }
    }
    if (m.invoice) invoicesCount++;
  });

  const outstanding = Math.max(0, projectValue - received);

  let baseReceived = received;
  let taxReceived = 0;

  if (hasGst && projectValue > 0) {
    baseReceived = Math.round((received / 1.18) * 100) / 100;
    taxReceived = Math.round((received - baseReceived) * 100) / 100;
  }

  const baseProgressPercent = totalBaseValue > 0 ? Math.min(100, Math.round((baseReceived / totalBaseValue) * 100)) : 0;
  const taxProgressPercent = (hasGst && totalTaxValue > 0) ? Math.min(100, Math.round((taxReceived / totalTaxValue) * 100)) : 0;

  // Filter invoices linked to this project
  const projectInvoices = invoices.filter((inv) =>
    project.milestones?.some((m) => m.invoice?._id === inv._id || m.invoice === inv._id)
  );

  const getStatusBadgeClass = (status) => {
    if (status === "Completed") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    return "bg-blue-50 text-blue-700 border-blue-100";
  };

  const getMilestoneCircleColor = (status, idx) => {
    if (status === "Paid") return "bg-emerald-500 text-white";
    if (status === "Invoiced") return "bg-indigo-500 text-white";
    return "bg-amber-500 text-white";
  };

  const selectedMilestone = selectedMilestoneIdx !== null ? project.milestones[selectedMilestoneIdx] : null;

  return (
    <div className="space-y-6 font-sans select-none animate-fade-in pb-12">
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
        <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-slate-50 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                {project.projectName}
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(project.status)}`}>
                {project.status}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              {project.projectId} &nbsp;|&nbsp; Client: <span className="text-slate-600 font-bold">{project.client?.companyName}</span>
            </p>
          </div>

          <div className="text-xs text-slate-500 font-semibold flex items-center gap-4 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 self-start md:self-auto">
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

        {/* Financial Metrics Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Project Value */}
          <div className="p-4 bg-slate-50/40 border border-slate-100 rounded-xl">
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

          {/* Received */}
          <div className="p-4 bg-emerald-50/20 border border-emerald-100/50 rounded-xl">
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-650">Received</span>
            <h4 className="text-lg font-black text-emerald-600 mt-1">{formatWithINRConversion(received, project.currency)}</h4>
          </div>

          {/* Outstanding */}
          <div className="p-4 bg-rose-50/20 border border-rose-100/50 rounded-xl">
            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500">Outstanding</span>
            <h4 className="text-lg font-black text-rose-600 mt-1">{formatWithINRConversion(outstanding, project.currency)}</h4>
          </div>

          {/* Invoices Count */}
          <div className="p-4 bg-indigo-50/20 border border-indigo-100/50 rounded-xl">
            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-650">Invoices</span>
            <h4 className="text-lg font-black text-indigo-600 mt-1">{invoicesCount}</h4>
          </div>

          {/* Next Due */}
          <div className="p-4 bg-amber-50/20 border border-amber-100/50 rounded-xl col-span-2 md:col-span-1">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Progress Bar 1: Base Amount (Exclusive GST) */}
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

          {/* Progress Bar 2: Tax (GST) Progress */}
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

        {/* Payment Milestones & Installments Table */}
        <div className="space-y-4 pt-4 border-t border-slate-50">
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
                  const invoiceId = m.invoice?._id || m.invoice;
                  return (
                    <tr
                      key={m._id || idx}
                      onClick={() => setSelectedMilestoneIdx(idx)}
                      className={`hover:bg-slate-50/50 cursor-pointer transition-colors font-semibold ${
                        isSelected ? "bg-indigo-50/30" : ""
                      }`}
                    >
                      <td className="py-3.5 pl-4 flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${getMilestoneCircleColor(m.status, idx)}`}>
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-bold truncate max-w-[180px]">{m.name}</span>
                      </td>
                      <td className="py-3.5 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatWithINRConversion(m.amount, project.currency)}
                      </td>
                      <td className="py-3.5 pl-12 text-slate-500">
                        {m.dueDate ? new Date(m.dueDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          m.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : m.status === "Invoiced"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {invoiceId ? (
                          <span
                            onClick={() => {
                              if (currentUser?.role === "Employee") {
                                handleViewInvoicePreview(invoiceId);
                              } else {
                                navigate(`/invoices/${invoiceId}/edit`);
                              }
                            }}
                            className="text-[#5D5FEF] font-black hover:underline cursor-pointer flex items-center justify-center gap-0.5"
                          >
                            <span>{m.invoice?.invoiceNumber || "INV LINK"}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                        ) : (
                          currentUser?.role === "Employee" ? (
                            <span className="text-slate-400 text-[10px] font-bold">-</span>
                          ) : (
                            <button
                              onClick={() => {
                                const isForeign = project.client?.isForeign === true;
                                const isPersonal = m.isPersonal === true;
                                const gstRate = (isForeign || isPersonal) ? 0 : 18;
                                const isInclusive = m.isInclusive === true;
                                let rate = m.amount;
                                if (isInclusive && gstRate > 0) {
                                  rate = Math.round(m.amount / (1 + gstRate / 100));
                                }
                                const draftInvoice = {
                                  client: project.client?._id || project.client,
                                  currency: project.currency || "INR (₹)",
                                  dueDate: m.dueDate ? new Date(m.dueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                                  items: [
                                    {
                                      serviceName: m.service,
                                      description: m.name,
                                      sacCode: "998314",
                                      qty: 1,
                                      rate: rate,
                                      amount: rate,
                                      gstRate: gstRate,
                                      isInclusive: isInclusive && gstRate > 0,
                                      originalAmount: m.amount,
                                    },
                                  ],
                                  projectId: project._id,
                                  milestoneId: m._id,
                                };
                                navigate("/invoices/create", { state: { draftInvoice } });
                              }}
                              className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-sm shadow-indigo-500/5 inline-flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              <span>Generate</span>
                            </button>
                          )
                        )}
                      </td>
                      <td className="py-3.5 text-center pr-4" onClick={(e) => e.stopPropagation()}>
                        {invoiceId && (
                          <button
                            onClick={() => handleViewInvoicePreview(invoiceId)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="View Invoice Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
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
          <div className="space-y-4 pt-4 border-t border-slate-55">
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
                      onClick={() => {
                        if (currentUser?.role === "Employee") {
                          handleViewInvoicePreview(inv._id);
                        } else {
                          navigate(`/invoices/${inv._id}/edit`);
                        }
                      }}
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
        <div className="space-y-4 pt-4 border-t border-slate-50">
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
    </div>
  );
}
