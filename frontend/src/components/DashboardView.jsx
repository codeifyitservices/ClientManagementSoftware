import React from "react";
import { Eye, Download, Receipt, Users, Plus } from "lucide-react";
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
  onViewClient,
  onViewInvoice,
  onDownloadInvoicePdf,
  onMarkInvoiceAsPaid,
  onNavigate,
  onCreateInvoice,
  onAddClient,
  processingInvoiceIds = {},
}) {
  // Sort and limit invoices to top 5 recent
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Limit clients to top 4 recent
  const recentClients = [...clients]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Financial calculations
  const paidInvoices = invoices.filter((i) => i.paymentStatus === "Paid");
  const pendingInvoices = invoices.filter((i) => i.paymentStatus === "Pending");

  const totalPaidRevenue = paidInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPendingRevenue = pendingInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalInvoiced = totalPaidRevenue + totalPendingRevenue;

  // Pie chart calculations
  const totalCount = invoices.length || 1;
  const paidPercent = Math.round((paidInvoices.length / totalCount) * 100);
  const pendingPercent = Math.round((pendingInvoices.length / totalCount) * 100);
  const draftPercent = Math.max(0, 100 - paidPercent - pendingPercent);

  // Recharts Pie Data
  const pieData = [
    { name: "Paid", value: paidInvoices.length, color: "#10B981" },
    { name: "Pending", value: pendingInvoices.length, color: "#F59E0B" },
  ].filter((item) => item.value > 0);

  // Soft background monogram colors
  const monogramColors = [
    { bg: "bg-blue-50", text: "text-blue-600" },
    { bg: "bg-purple-50", text: "text-purple-600" },
    { bg: "bg-emerald-50", text: "text-emerald-600" },
    { bg: "bg-pink-50", text: "text-pink-600" },
  ];

  const getMonogram = (name = "") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Generate dynamic 6-month revenue overview trend data
  const getMonthlyRevenueData = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const monthRevenue = invoices
        .filter((inv) => {
          const invDate = new Date(inv.invoiceDate || inv.createdAt);
          return invDate.getMonth() === m && invDate.getFullYear() === y && inv.paymentStatus === "Paid";
        })
        .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
        
      data.push({
        name: `${monthNames[m]} ${y.toString().slice(-2)}`,
        revenue: monthRevenue,
      });
    }
    return data;
  };

  const chartData = getMonthlyRevenueData();

  // Dynamic growth calculations for Chart sub-headings
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in font-sans">
      
      {/* LEFT SECTION (8 columns width) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Recent Invoices Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow h-[340px] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-55">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-none">Recent Invoices</h3>
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
                <div key={inv._id} className="py-3 flex items-center justify-between gap-4">
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
                        ₹{inv.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-55">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-none">New Client Profiles</h3>
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
                    <div className={`h-11 w-11 rounded-2xl ${colors.bg} ${colors.text} flex items-center justify-center font-black text-sm mx-auto shadow-sm select-none`}>
                      {getMonogram(c.companyName)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 truncate" title={c.companyName}>
                        {c.companyName}
                      </h4>
                      <p className="text-[10px] text-slate-455 truncate mt-0.5" title={c.email}>
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
      <div className="lg:col-span-4 space-y-6">
        
        {/* Revenue Overview Chart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-extrabold text-slate-900">Revenue Overview</h3>
            <span className="text-[8px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full select-none">
              6 Months Trend
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900">
                ₹{totalPaidRevenue.toLocaleString("en-IN")}
              </span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                revGrowthPercent >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-650"
              }`}>
                {revGrowthPercent >= 0 ? `+${revGrowthPercent}%` : `${revGrowthPercent}%`}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-slate-400">
              vs last month: ₹{revLastMonth.toLocaleString("en-IN")}
            </p>
          </div>

          {/* Recharts Area Chart */}
          <div className="pt-4 h-32 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5D5FEF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5D5FEF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={8} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={8}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
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
                  formatter={(value) => [`₹${value.toLocaleString()}`, "Revenue"]}
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
          <h3 className="text-sm font-extrabold text-slate-900 mb-4">Invoice Status</h3>

          <div className="flex items-center gap-6 justify-center sm:justify-start">
            {/* Recharts Pie Chart Donut */}
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
              {/* Center count bubble */}
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">
                <span className="text-xs font-black text-slate-900">{invoices.length}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Total</span>
              </div>
            </div>

            {/* Legends list */}
            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 block shrink-0" />
                <span className="font-semibold text-slate-500 w-14">Paid</span>
                <span className="font-bold text-slate-900">
                  {paidInvoices.length} ({paidPercent}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 block shrink-0" />
                <span className="font-semibold text-slate-500 w-14">Pending</span>
                <span className="font-bold text-slate-900">
                  {pendingInvoices.length} ({pendingPercent}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-350 block shrink-0" />
                <span className="font-semibold text-slate-500 w-14">Draft</span>
                <span className="font-bold text-slate-900">
                  0 ({draftPercent}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
          <h3 className="text-sm font-extrabold text-slate-900 mb-4">Quick Actions</h3>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Create Invoice Action */}
            <button
              onClick={onCreateInvoice}
              className="p-4 bg-violet-50 hover:bg-violet-100 border border-violet-100 rounded-2xl text-center flex flex-col items-center gap-2 text-indigo-700 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="p-2 bg-indigo-500/10 rounded-xl">
                <Plus className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-[11px] font-bold">Create Invoice</span>
            </button>

            {/* Add Client Action */}
            <button
              onClick={onAddClient}
              className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-2xl text-center flex flex-col items-center gap-2 text-blue-700 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Plus className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-[11px] font-bold">Add Client</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
