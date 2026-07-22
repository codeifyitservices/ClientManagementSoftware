import React from "react";
import { Users, FileText, Check, Clock, Wallet } from "lucide-react";

export default function DashboardStats({ clients = [], invoices = [] }) {
  const totalClients = clients.length;
  const totalInvoices = invoices.length;

  const paidInvoices = invoices.filter((i) => i.paymentStatus === "Paid");
  const pendingInvoices = invoices.filter((i) => i.paymentStatus === "Pending");

  const totalPaidRevenue = paidInvoices.reduce(
    (sum, i) => sum + (Number(i.totalAmount) || 0),
    0
  );
  const totalPendingRevenue = pendingInvoices.reduce(
    (sum, i) => sum + (Number(i.totalAmount) || 0),
    0
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

  // 3. Paid revenue growth percentage (This month's paid vs Last month's paid)
  const revThisMonth = paidInvoices
    .filter((i) => {
      const d = new Date(i.invoiceDate || i.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);

  const revLastMonth = paidInvoices
    .filter((i) => {
      const d = new Date(i.invoiceDate || i.createdAt);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    })
    .reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);

  let revGrowthPercent = 0;
  if (revLastMonth > 0) {
    revGrowthPercent = Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100);
  } else if (revThisMonth > 0) {
    revGrowthPercent = 100;
  }

  const stats = [
    {
      title: "Total Clients",
      value: totalClients,
      subtitle: `+${clientsThisMonth} this month`,
      subtitleColor: "text-emerald-500",
      icon: Users,
      iconColor: "text-[#5D5FEF]",
      iconBg: "bg-[#5D5FEF]/10",
    },
    {
      title: "Total Invoices",
      value: totalInvoices,
      subtitle: `+${invoicesThisMonth} this month`,
      subtitleColor: "text-emerald-500",
      icon: FileText,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
    },
    {
      title: "Paid Invoices",
      value: paidInvoices.length,
      subtitle: `₹${totalPaidRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} received`,
      subtitleColor: "text-emerald-500",
      icon: Check,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
    },
    {
      title: "Pending Invoices",
      value: pendingInvoices.length,
      subtitle: `₹${totalPendingRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} outstanding`,
      subtitleColor: "text-amber-500",
      icon: Clock,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
    },
    {
      title: "Total Revenue",
      value: `₹${totalPaidRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      subtitle: revGrowthPercent >= 0 ? `+${revGrowthPercent}% this month` : `${revGrowthPercent}% this month`,
      subtitleColor: revGrowthPercent >= 0 ? "text-emerald-500" : "text-red-500",
      icon: Wallet,
      iconColor: "text-indigo-650",
      iconBg: "bg-indigo-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300 select-none"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {stat.title}
              </p>
              <h4 className="text-2xl font-black text-slate-900 leading-tight">
                {typeof stat.value === "number"
                  ? stat.value.toLocaleString()
                  : stat.value}
              </h4>
              <span className={`text-[10px] font-bold mt-1 block ${stat.subtitleColor}`}>
                {stat.subtitle}
              </span>
            </div>
            <div className={`p-3 rounded-2xl shrink-0 ${stat.iconBg} ${stat.iconColor}`}>
              <Icon className="h-5 w-5" strokeWidth={2.5} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
