import React from "react";
import { convertToINR } from "../utils/currencyUtils";
import {
  Eye,
  Download,
  Receipt,
  Plus,
  FolderOpen,
  Target,
  Wallet,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function DashboardView({
  clients = [],
  invoices = [],
  projects = [],
  leads = [],
  onViewClient,
  onViewInvoice,
  onDownloadInvoicePdf,
  onMarkInvoiceAsPaid,
  onNavigate,
  onCreateInvoice,
  onAddClient,
  onCreateProject,
  onAddLead,
  processingInvoiceIds = {},
  activeAlerts = [],
}) {
  // ---------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------

  const recentInvoices = [...invoices]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const recentClients = [...clients]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 4);

  const ongoingProjects = projects.filter(
    (p) => p.status === "Ongoing" || !p.status,
  );
  const completedProjects = projects.filter((p) => p.status === "Completed");
  const projectCompletionRate = projects.length
    ? Math.round((completedProjects.length / projects.length) * 100)
    : 0;

  const recentProjects = [...projects]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.startDate).getTime() -
        new Date(a.createdAt || a.startDate).getTime(),
    )
    .slice(0, 4);

  const activeLeads = leads.filter(
    (l) =>
      l.currentStage !== "Won" &&
      l.currentStage !== "Lost" &&
      l.currentStatus !== "Completed" &&
      l.currentStatus !== "Cancelled",
  );
  const wonLeads = leads.filter((l) => l.currentStage === "Won");
  const totalPipelineValue = activeLeads.reduce(
    (sum, l) => sum + (Number(l.value) || 0),
    0,
  );

  const recentLeads = [...activeLeads]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 4);

  const paidInvoices = invoices.filter((i) => i.paymentStatus === "Paid");
  const pendingInvoices = invoices.filter((i) => i.paymentStatus === "Pending");

  const totalPaidRevenue = paidInvoices.reduce(
    (sum, i) => sum + i.totalAmount,
    0,
  );
  const totalPendingRevenue = pendingInvoices.reduce(
    (sum, i) => sum + i.totalAmount,
    0,
  );

  const totalCount = invoices.length || 1;
  const paidPercent = Math.round((paidInvoices.length / totalCount) * 100);
  const pendingPercent = Math.round(
    (pendingInvoices.length / totalCount) * 100,
  );
  const draftPercent = Math.max(0, 100 - paidPercent - pendingPercent);

  const pieData = [
    { name: "Paid", value: paidInvoices.length, color: "#10B981" },
    { name: "Pending", value: pendingInvoices.length, color: "#F59E0B" },
  ].filter((item) => item.value > 0);

  const monogramColors = [
    { bg: "bg-blue-50", text: "text-blue-600" },
    { bg: "bg-purple-50", text: "text-purple-600" },
    { bg: "bg-emerald-50", text: "text-emerald-600" },
    { bg: "bg-pink-50", text: "text-pink-600" },
  ];

  const getMonogram = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const getMonthlyRevenueData = () => {
    const monthNames = [
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
    const data = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();

      const monthRevenue = invoices
        .filter((inv) => {
          const invDate = new Date(inv.invoiceDate || inv.createdAt);
          return (
            invDate.getMonth() === m &&
            invDate.getFullYear() === y &&
            inv.paymentStatus === "Paid"
          );
        })
        .reduce((sum, inv) => sum + convertToINR(inv.totalAmount, inv.currency), 0);

      data.push({
        name: `${monthNames[m]} ${y.toString().slice(-2)}`,
        revenue: monthRevenue,
      });
    }
    return data;
  };

  const chartData = getMonthlyRevenueData();

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const revThisMonth = paidInvoices
    .filter((i) => {
      const d = new Date(i.invoiceDate || i.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, i) => sum + convertToINR(i.totalAmount, i.currency), 0);

  const revLastMonth = paidInvoices
    .filter((i) => {
      const d = new Date(i.invoiceDate || i.createdAt);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    })
    .reduce((sum, i) => sum + convertToINR(i.totalAmount, i.currency), 0);

  let revGrowthPercent = 0;
  if (revLastMonth > 0) {
    revGrowthPercent = Math.round(
      ((revThisMonth - revLastMonth) / revLastMonth) * 100,
    );
  } else if (revThisMonth > 0) {
    revGrowthPercent = 100;
  }

  const getLeadStageBadge = (stage) => {
    switch (stage) {
      case "New Lead":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "Proposal Sent":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Negotiation":
        return "bg-orange-50 text-orange-700 border-orange-100";
      case "Won":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      default:
        return "bg-purple-50 text-purple-700 border-purple-100";
    }
  };

  // ---------------------------------------------------------------------
  // Business Overview KPI cards
  // ---------------------------------------------------------------------

  // Top row: Total Revenue spans 2 columns, plus 2 single cards (4 column-units total)
  const kpiTopRow = [
    {
      label: "Total Revenue (Paid)",
      value: `₹${totalPaidRevenue.toLocaleString("en-IN")}`,
      sub: `${revGrowthPercent >= 0 ? "+" : ""}${revGrowthPercent}% vs last month`,
      positive: revGrowthPercent >= 0,
      icon: Wallet,
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      span: "col-span-2",
      featured: true,
    },
    {
      label: "Pending Revenue",
      value: `₹${totalPendingRevenue.toLocaleString("en-IN")}`,
      sub: `${pendingInvoices.length} unpaid invoice${pendingInvoices.length === 1 ? "" : "s"}`,
      icon: Clock,
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
    {
      label: "Active Clients",
      value: clients.length,
      sub: `${recentClients.length} added recently`,
      icon: Users,
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
  ];

  // Bottom row: 3 equal-width cards
  const kpiBottomRow = [
    {
      label: "Ongoing Projects",
      value: ongoingProjects.length,
      sub: `${projectCompletionRate}% overall completion`,
      icon: FolderOpen,
      bg: "bg-purple-50",
      text: "text-purple-600",
    },
    {
      label: "Pipeline Value",
      value: `₹${totalPipelineValue.toLocaleString("en-IN")}`,
      sub: `${activeLeads.length} active leads`,
      icon: Target,
      bg: "bg-sky-50",
      text: "text-sky-600",
    },
    {
      label: "Won Deals",
      value: wonLeads.length,
      sub: `${leads.length} total leads tracked`,
      icon: TrendingUp,
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
  ];

  const renderKpiCard = (kpi) => {
    const Icon = kpi.icon;
    const TrendIcon =
      kpi.positive === undefined
        ? null
        : kpi.positive
          ? TrendingUp
          : TrendingDown;
    return (
      <div
        key={kpi.label}
        className={`${kpi.span || ""} bg-white border border-slate-100 rounded-2xl p-4 custom-shadow flex flex-col justify-between gap-3 h-full`}
      >
        <div
          className={`h-9 w-9 rounded-xl ${kpi.bg} ${kpi.text} flex items-center justify-center`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <span
            className={`${kpi.featured ? "text-2xl" : "text-lg"} font-black text-slate-900 leading-tight block truncate`}
          >
            {kpi.value}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mt-0.5">
            {kpi.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-450">
          {TrendIcon && (
            <TrendIcon
              className={`h-3 w-3 ${kpi.positive ? "text-emerald-500" : "text-red-500"}`}
            />
          )}
          <span>{kpi.sub}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* ================================================================
          BUSINESS OVERVIEW — top-level KPI summary
      ================================================================ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 leading-none">
              Business Overview
            </h2>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              Snapshot of revenue, clients, projects and pipeline
            </p>
          </div>
        </div>

        {/* Row 1: Total Revenue spans 2 cards + 2 single cards = 4 column-units */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpiTopRow.map(renderKpiCard)}
        </div>

        {/* Row 2: 3 equal-width cards filling the same overall width */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {kpiBottomRow.map(renderKpiCard)}
        </div>
      </section>

      {/* ================================================================
          ALERTS
      ================================================================ */}
      {activeAlerts.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs select-none">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span>
              Approaching Subscription Renewals ({activeAlerts.length})
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeAlerts.map((alert) => (
              <div
                key={`${alert.subscriptionId}-${alert.alertType}`}
                className="bg-white border border-rose-100/60 rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <span className="font-extrabold text-slate-900 truncate block sm:inline">
                    {alert.client?.companyName}
                  </span>
                  <span className="text-slate-450 font-medium">
                    {" "}
                    &bull;{" "}
                    {alert.type.charAt(0).toUpperCase() +
                      alert.type.slice(1)}{" "}
                    expires on{" "}
                    {new Date(alert.endDate).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <button
                  onClick={() => onNavigate("subscriptions")}
                  className="text-[10px] font-bold text-[#5D5FEF] hover:underline cursor-pointer shrink-0"
                >
                  Manage &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================
          MAIN GRID — left detail column / right insights column
      ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT SECTION (8 columns width) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* PROJECTS OVERVIEW BLOCK */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-none">
                    Projects Overview
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                    {ongoingProjects.length} Ongoing &bull;{" "}
                    {completedProjects.length} Completed
                  </span>
                </div>
              </div>
              <button
                onClick={() => onNavigate("projects")}
                className="text-[10px] font-bold text-[#5D5FEF] hover:text-[#4d4fdf] hover:underline cursor-pointer"
              >
                View Projects &rarr;
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ongoing
                  </span>
                  <span className="text-lg font-black text-emerald-600">
                    {ongoingProjects.length}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Completed
                  </span>
                  <span className="text-lg font-black text-blue-600">
                    {completedProjects.length}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Completion Rate
                  </span>
                  <span className="text-lg font-black text-purple-600">
                    {projectCompletionRate}%
                  </span>
                </div>
              </div>

              <div className="w-full sm:w-44 space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-slate-500">
                  <span>Done</span>
                  <span>{projectCompletionRate}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 rounded-full"
                    style={{ width: `${projectCompletionRate}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {recentProjects.length === 0 ? (
                <div className="py-6 text-center text-slate-400 font-semibold text-xs">
                  No active projects found. Click Create Project to start one.
                </div>
              ) : (
                recentProjects.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => onNavigate(`projects/${p._id}`)}
                    className="p-3.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {p.projectName}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            p.status === "Completed"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {p.status || "Ongoing"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 mt-0.5 truncate">
                        {p.client?.companyName ||
                          p.client?.clientName ||
                          "Client Unassigned"}{" "}
                        &bull; ID: {p.projectId}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-950 block">
                        ₹
                        {(p.finalAmount || p.projectValue || 0).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold">
                        Ends:{" "}
                        {p.expectedEndDate
                          ? new Date(p.expectedEndDate).toLocaleDateString(
                              "en-IN",
                            )
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LEADS PIPELINE BLOCK */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-none">
                    Leads Pipeline Overview
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                    {activeLeads.length} Active Leads &bull; {wonLeads.length}{" "}
                    Won Deals
                  </span>
                </div>
              </div>
              <button
                onClick={() => onNavigate("leads")}
                className="text-[10px] font-bold text-[#5D5FEF] hover:text-[#4d4fdf] hover:underline cursor-pointer"
              >
                View Pipeline &rarr;
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-sky-50/30 border border-sky-100/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Active Leads
                  </span>
                  <span className="text-lg font-black text-sky-600">
                    {activeLeads.length}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Won Deals
                  </span>
                  <span className="text-lg font-black text-emerald-600">
                    {wonLeads.length}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Pipeline Value
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    ₹{totalPipelineValue.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onNavigate("leads")}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors shadow-sm cursor-pointer shrink-0"
              >
                Manage Leads
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {recentLeads.length === 0 ? (
                <div className="py-6 text-center text-slate-400 font-semibold text-xs">
                  No active leads in pipeline. Click Add Lead to create one.
                </div>
              ) : (
                recentLeads.map((l) => (
                  <div
                    key={l._id}
                    onClick={() => onNavigate(`leads/${l._id}`)}
                    className="p-3.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {l.leadName}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[8px] font-bold border ${getLeadStageBadge(l.currentStage)}`}
                        >
                          {l.currentStage || "New Lead"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 mt-0.5 truncate">
                        {l.companyName || "No Company"} &bull; Source:{" "}
                        {l.source || "Direct"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-950 block">
                        ₹{(l.value || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold">
                        Follow-up:{" "}
                        {l.currentNextFollowUpDate
                          ? new Date(
                              l.currentNextFollowUpDate,
                            ).toLocaleDateString("en-IN")
                          : "Not set"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Invoices Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow h-[340px] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 leading-none">
                  Recent Invoices
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                  Last generated customer transactions
                </span>
              </div>
              <button
                onClick={() => onNavigate("invoices")}
                className="text-[10px] font-bold text-[#5D5FEF] hover:text-[#4d4fdf] hover:underline cursor-pointer"
              >
                View Ledger &rarr;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 mt-2 pr-1">
              {recentInvoices.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 font-semibold text-xs py-8">
                  No invoices recorded. Click Create Invoice to build one.
                </div>
              ) : (
                recentInvoices.map((inv) => (
                  <div
                    key={inv._id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-indigo-50 text-[#5D5FEF] flex items-center justify-center">
                        <Receipt className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {inv.invoiceNumber}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                          {inv.client?.companyName || "Unknown Client"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <h5 className="text-xs font-black text-slate-950">
                          ₹
                          {inv.totalAmount?.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </h5>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider mt-0.5 ${
                            inv.paymentStatus === "Paid"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDownloadInvoicePdf(inv)}
                          disabled={processingInvoiceIds[inv._id]}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer disabled:opacity-40"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Clients Grid */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 leading-none">
                  New Client Profiles
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                  Recently added coordinates and GSTIN mappings
                </span>
              </div>
              <button
                onClick={() => onNavigate("clients")}
                className="text-[10px] font-bold text-[#5D5FEF] hover:text-[#4d4fdf] hover:underline cursor-pointer"
              >
                All Clients &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {recentClients.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-400 font-semibold text-xs">
                  No client profiles found. Click Add Client to get started.
                </div>
              ) : (
                recentClients.map((c, index) => {
                  const colors = monogramColors[index % monogramColors.length];
                  return (
                    <div
                      key={c._id}
                      className="p-4 rounded-2xl border border-slate-100/60 bg-slate-50/20 text-center flex flex-col justify-between gap-3 transition-colors hover:bg-slate-50/50"
                    >
                      <div
                        className={`h-11 w-11 rounded-2xl ${colors.bg} ${colors.text} flex items-center justify-center font-black text-sm mx-auto shadow-sm select-none`}
                      >
                        {getMonogram(c.companyName)}
                      </div>
                      <div>
                        <h4
                          className="text-xs font-bold text-slate-900 truncate"
                          title={c.companyName}
                        >
                          {c.companyName}
                        </h4>
                        <p
                          className="text-[10px] text-slate-455 truncate mt-0.5"
                          title={c.email}
                        >
                          {c.email}
                        </p>
                        <p className="text-[10px] text-slate-455 truncate mt-0.5">
                          {c.phone || "—"}
                        </p>
                      </div>
                      <button
                        onClick={() => onViewClient(c)}
                        className="text-[10px] font-bold text-[#5D5FEF] hover:text-[#4d4fdf] hover:underline block mx-auto cursor-pointer"
                      >
                        View Details &rarr;
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SECTION (4 columns width) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Revenue Overview Chart */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                Revenue Overview
              </h3>
              <span className="text-[8px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full select-none">
                6 Months Trend
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-900">
                  ₹{totalPaidRevenue.toLocaleString("en-IN")}
                </span>
                <span
                  className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    revGrowthPercent >= 0
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-650"
                  }`}
                >
                  {revGrowthPercent >= 0
                    ? `+${revGrowthPercent}%`
                    : `${revGrowthPercent}%`}
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-400">
                vs last month: ₹{revLastMonth.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="pt-4 h-32 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#5D5FEF" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#5D5FEF"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F1F5F9"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#94A3B8"
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) =>
                      `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0B0C24",
                      borderRadius: "12px",
                      border: "none",
                      color: "#fff",
                      fontSize: "9px",
                      fontWeight: "bold",
                    }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#94A3B8" }}
                    formatter={(value) => [
                      `₹${value.toLocaleString()}`,
                      "Revenue",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#5D5FEF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Invoice Status Donut Chart */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">
              Invoice Status
            </h3>

            <div className="flex items-center gap-6 justify-center sm:justify-start">
              <div className="relative h-24 w-24 shrink-0">
                {invoices.length === 0 ? (
                  <div className="w-full h-full rounded-full border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                    No Data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={40}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#0B0C24",
                          borderRadius: "12px",
                          border: "none",
                          color: "#fff",
                          fontSize: "9px",
                          fontWeight: "bold",
                        }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(value) => [value, "Invoices"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">
                  <span className="text-xs font-black text-slate-900">
                    {invoices.length}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
                    Total
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 block shrink-0" />
                  <span className="font-semibold text-slate-500 w-14">
                    Paid
                  </span>
                  <span className="font-bold text-slate-900">
                    {paidInvoices.length} ({paidPercent}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 block shrink-0" />
                  <span className="font-semibold text-slate-500 w-14">
                    Pending
                  </span>
                  <span className="font-bold text-slate-900">
                    {pendingInvoices.length} ({pendingPercent}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-350 block shrink-0" />
                  <span className="font-semibold text-slate-500 w-14">
                    Draft
                  </span>
                  <span className="font-bold text-slate-900">
                    0 ({draftPercent}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel — grows to fill remaining height so this column's
              bottom edge lines up with the left column's bottom edge */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow flex-1 flex flex-col">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">
              Quick Actions
            </h3>

            <div className="grid grid-cols-2 gap-3 flex-1 content-start">
              <button
                onClick={onCreateInvoice}
                className="p-3 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded-xl text-center flex flex-col items-center gap-1.5 text-indigo-700 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                  <Plus className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-[10px] font-bold">Create Invoice</span>
              </button>

              <button
                onClick={onAddClient}
                className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl text-center flex flex-col items-center gap-1.5 text-blue-700 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                  <Plus className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-[10px] font-bold">Add Client</span>
              </button>

              <button
                onClick={
                  onCreateProject || (() => onNavigate("projects/create"))
                }
                className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl text-center flex flex-col items-center gap-1.5 text-purple-700 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="p-1.5 bg-purple-500/10 rounded-lg">
                  <Plus className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-[10px] font-bold">Create Project</span>
              </button>

              <button
                onClick={onAddLead || (() => onNavigate("leads/create"))}
                className="p-3 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-xl text-center flex flex-col items-center gap-1.5 text-sky-700 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="p-1.5 bg-sky-500/10 rounded-lg">
                  <Plus className="h-4 w-4 text-sky-600" />
                </div>
                <span className="text-[10px] font-bold">Add Lead</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
