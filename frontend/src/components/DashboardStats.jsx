import React from "react";
import { convertToINR } from "../utils/currencyUtils";
import {
  Users,
  FileText,
  Check,
  Clock,
  Wallet,
  FolderOpen,
  Target,
} from "lucide-react";

export default function DashboardStats({
  clients = [],
  invoices = [],
  projects = [],
  leads = [],
}) {
  const totalClients = clients.length;
  const totalInvoices = invoices.length;

  const paidInvoices = invoices.filter((i) => i.paymentStatus === "Paid");
  const pendingInvoices = invoices.filter((i) => i.paymentStatus === "Pending");

  const totalPaidRevenue = paidInvoices.reduce(
    (sum, i) => sum + convertToINR(i.totalAmount, i.currency),
    0,
  );
  const totalPendingRevenue = pendingInvoices.reduce(
    (sum, i) => sum + convertToINR(i.totalAmount, i.currency),
    0,
  );

  // Dynamic calculations for growth stats (current month vs previous month)
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  // 1. Clients growth this month
  const clientsThisMonth = clients.filter((c) => {
    const d = new Date(c.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  // 2. Invoices growth this month
  const invoicesThisMonth = invoices.filter((i) => {
    const d = new Date(i.invoiceDate || i.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  // 3. Paid revenue growth percentage
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

  // Projects calculations
  const ongoingProjects = projects.filter(
    (p) => p.status === "Ongoing" || !p.status,
  ).length;
  const completedProjects = projects.filter(
    (p) => p.status === "Completed",
  ).length;
  const totalProjectValue = projects.reduce(
    (sum, p) => sum + (Number(p.finalAmount || p.projectValue) || 0),
    0,
  );

  // Leads calculations
  const activeLeads = leads.filter(
    (l) =>
      l.currentStage !== "Won" &&
      l.currentStage !== "Lost" &&
      l.currentStatus !== "Completed" &&
      l.currentStatus !== "Cancelled",
  ).length;
  const wonLeads = leads.filter((l) => l.currentStage === "Won").length;
  const lostLeads = leads.filter((l) => l.currentStage === "Lost").length;
  const pipelineValue = leads
    .filter((l) => l.currentStage !== "Won" && l.currentStage !== "Lost")
    .reduce((sum, l) => sum + (Number(l.value) || 0), 0);

  // Total Revenue is the featured stat — rendered first, spans 2 card-widths.
  const revenueStat = {
    title: "Total Revenue",
    value: `₹${totalPaidRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
    subtitle:
      revGrowthPercent >= 0
        ? `+${revGrowthPercent}% this month`
        : `${revGrowthPercent}% this month`,
    subtitleColor: revGrowthPercent >= 0 ? "text-emerald-500" : "text-red-500",
    icon: Wallet,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    badges: null,
    featured: true,
  };

  // Top row: Total Revenue (2 slots) + 3 single-slot cards = 5 column-units
  const topRowStats = [
    revenueStat,
    {
      title: "Total Clients",
      value: totalClients,
      subtitle: `+${clientsThisMonth} this month`,
      subtitleColor: "text-emerald-500",
      icon: Users,
      iconColor: "text-[#5D5FEF]",
      iconBg: "bg-[#5D5FEF]/10",
      badges: null,
    },
    {
      title: "Total Invoices",
      value: totalInvoices,
      subtitle: `+${invoicesThisMonth} this month`,
      subtitleColor: "text-emerald-500",
      icon: FileText,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
      badges: null,
    },
    {
      title: "Paid Invoices",
      value: paidInvoices.length,
      subtitle: `₹${totalPaidRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} received`,
      subtitleColor: "text-emerald-500",
      icon: Check,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
      badges: null,
    },
  ];

  // Bottom row: 3 equal-width cards
  const bottomRowStats = [
    {
      title: "Projects",
      value: projects.length,
      subtitle: `₹${totalProjectValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} total val`,
      subtitleColor: "text-purple-600",
      icon: FolderOpen,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50",
      badges: [
        {
          label: "Ongoing",
          count: ongoingProjects,
          color: "bg-emerald-50 text-emerald-700 border-emerald-100",
        },
        {
          label: "Done",
          count: completedProjects,
          color: "bg-blue-50 text-blue-700 border-blue-100",
        },
      ],
    },
    {
      title: "Leads Pipeline",
      value: leads.length,
      subtitle: `₹${pipelineValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} pipeline`,
      subtitleColor: "text-sky-600",
      icon: Target,
      iconColor: "text-sky-600",
      iconBg: "bg-sky-50",
      badges: [
        {
          label: "Active",
          count: activeLeads,
          color: "bg-sky-50 text-sky-700 border-sky-100",
        },
        {
          label: "Won",
          count: wonLeads,
          color: "bg-emerald-50 text-emerald-700 border-emerald-100",
        },
        {
          label: "Lost",
          count: lostLeads,
          color: "bg-rose-50 text-rose-700 border-rose-100",
        },
      ],
    },
    {
      title: "Pending Invoices",
      value: pendingInvoices.length,
      subtitle: `₹${totalPendingRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} pending`,
      subtitleColor: "text-amber-500",
      icon: Clock,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
      badges: null,
    },
  ];

  const renderStatCard = (stat, index) => {
    const Icon = stat.icon;
    return (
      <div
        key={index}
        className={`${stat.featured ? "col-span-2" : ""} p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex flex-col justify-between transition-all hover:translate-y-[-2px] duration-300 select-none h-full min-h-[125px]`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">
              {stat.title}
            </p>
            <h4
              className={`${stat.featured ? "text-3xl" : "text-2xl"} font-black text-slate-900 leading-tight`}
            >
              {typeof stat.value === "number"
                ? stat.value.toLocaleString()
                : stat.value}
            </h4>
          </div>
          <div
            className={`p-2.5 rounded-2xl shrink-0 ${stat.iconBg} ${stat.iconColor}`}
          >
            <Icon className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Badges row for multi-count cards (Projects & Leads) */}
        {stat.badges ? (
          <div>
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {stat.badges.map((b, i) => (
                <span
                  key={i}
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border ${b.color}`}
                >
                  {b.label}: {b.count}
                </span>
              ))}
            </div>
            <span className="text-[9px] font-semibold text-slate-400 mt-1 block truncate">
              {stat.subtitle}
            </span>
          </div>
        ) : (
          <span
            className={`text-[10px] font-bold mt-2 block ${stat.subtitleColor}`}
          >
            {stat.subtitle}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Row 1: Total Revenue (2 slots) + 3 single cards = 5 column-units */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {topRowStats.map(renderStatCard)}
      </div>

      {/* Row 2: 3 equal-width cards spanning the same overall width */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {bottomRowStats.map(renderStatCard)}
      </div>
    </div>
  );
}
