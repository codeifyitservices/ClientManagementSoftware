import React, { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Laptop,
  Briefcase,
  Coffee,
  PlayCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  Building2,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminAttendanceDashboard({ onNavigate, onNavigateTab, onViewDetails }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [shiftFilter, setShiftFilter] = useState("All");

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getAdminDashboard({
        date: selectedDate,
        department: departmentFilter,
        location: locationFilter,
        shift: shiftFilter,
      });
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        // Backend returns { success, kpis, departmentStats } at the root level
        setData(payload);
      }
    } catch (err) {
      console.error("Failed to load admin attendance dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000); // 15s live refresh
    return () => clearInterval(interval);
  }, [selectedDate, departmentFilter, locationFilter, shiftFilter]);

  const nav = onNavigate || onNavigateTab || (() => {});
  const kpis = data?.kpis || {};

  const kpiCards = [
    {
      label: "Total Workforce",
      value: kpis.totalEmployees || 0,
      subtext: "Active employee headcount",
      icon: Users,
      color: "from-blue-600 to-indigo-600",
      textColor: "text-blue-600",
      bgLight: "bg-blue-50/70 border-blue-100",
    },
    {
      label: "Present Today",
      value: kpis.present || 0,
      subtext: `${kpis.totalEmployees ? Math.round(((kpis.present || 0) / kpis.totalEmployees) * 100) : 0}% attendance rate`,
      icon: UserCheck,
      color: "from-emerald-600 to-teal-600",
      textColor: "text-emerald-600",
      bgLight: "bg-emerald-50/70 border-emerald-100",
      tab: "live",
    },
    {
      label: "Absent / Not In",
      value: kpis.absent || 0,
      subtext: "Employees with no punch",
      icon: UserX,
      color: "from-rose-600 to-red-600",
      textColor: "text-rose-600",
      bgLight: "bg-rose-50/70 border-rose-100",
      tab: "live",
    },
    {
      label: "Work From Home",
      value: kpis.wfh || 0,
      subtext: "Active remote sessions",
      icon: Laptop,
      color: "from-purple-600 to-violet-600",
      textColor: "text-purple-600",
      bgLight: "bg-purple-50/70 border-purple-100",
      tab: "wfh",
    },
    {
      label: "Currently On Break",
      value: kpis.onBreak || 0,
      subtext: "Active break intervals",
      icon: Coffee,
      color: "from-yellow-600 to-amber-600",
      textColor: "text-amber-600",
      bgLight: "bg-amber-50/70 border-amber-100",
      tab: "live",
    },
    {
      label: "Actively Working",
      value: kpis.currentlyWorking || 0,
      subtext: "Currently clocked in & active",
      icon: PlayCircle,
      color: "from-cyan-600 to-blue-600",
      textColor: "text-cyan-600",
      bgLight: "bg-cyan-50/70 border-cyan-100",
      tab: "live",
    },
    {
      label: "Late Arrivals",
      value: kpis.lateArrivals || 0,
      subtext: "Clocked in after shift grace",
      icon: Clock,
      color: "from-orange-600 to-amber-600",
      textColor: "text-orange-600",
      bgLight: "bg-orange-50/70 border-orange-100",
      tab: "records",
    },
    {
      label: "Early Checkouts",
      value: kpis.earlyCheckouts || 0,
      subtext: "Left before shift end",
      icon: Clock,
      color: "from-pink-600 to-rose-600",
      textColor: "text-pink-600",
      bgLight: "bg-pink-50/70 border-pink-100",
      tab: "records",
    },
    {
      label: "Overtime Workers",
      value: kpis.overtime || 0,
      subtext: "Hours exceeding 8h shift",
      icon: TrendingUp,
      color: "from-indigo-600 to-violet-600",
      textColor: "text-indigo-600",
      bgLight: "bg-indigo-50/70 border-indigo-100",
      tab: "records",
    },
    {
      label: "Pending Requests",
      value: kpis.pendingRequests || 0,
      subtext: `WFH (${kpis.pendingWfh || 0}) • Reg (${kpis.pendingRegularizations || 0}) • OD (${kpis.pendingOnDuty || 0})`,
      icon: FileCheck,
      color: "from-sky-600 to-blue-600",
      textColor: "text-sky-600",
      bgLight: "bg-sky-50/70 border-sky-100",
      tab: "wfh",
    },
    {
      label: "Attendance Exceptions",
      value: kpis.attendanceExceptions || 0,
      subtext: "Missing punches & policy flags",
      icon: AlertTriangle,
      color: "from-red-600 to-rose-700",
      textColor: "text-red-600",
      bgLight: "bg-red-50/70 border-red-100",
      tab: "exceptions",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top Multi-Dimension Filter Bar ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="IT">IT</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Locations</option>
              <option value="Headquarters">Headquarters</option>
              <option value="Branch Office">Branch Office</option>
              <option value="Remote">Remote</option>
            </select>
          </div>

          {/* Shift Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Clock className="h-4 w-4 text-slate-400" />
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Shifts</option>
              <option value="Full-time">Full-time (General)</option>
              <option value="Part-time">Part-time</option>
              <option value="Intern">Intern</option>
              <option value="Contract">Contract</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Avg Working Hours</span>
            <span className="text-sm font-black text-slate-900">{kpis.avgWorkingHours || "0.0"} hrs/person</span>
          </div>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => card.tab && nav(card.tab)}
              className={`bg-white border rounded-2xl p-4 shadow-sm transition-all relative overflow-hidden ${
                card.tab ? "hover:border-indigo-300 hover:shadow-md cursor-pointer group" : "border-slate-200/80"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {card.label}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {card.value}
                    </span>
                  </div>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${card.bgLight}`}>
                  <Icon className={`h-5 w-5 ${card.textColor}`} />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium truncate pr-2">{card.subtext}</span>
                {card.tab && (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Department Breakdown & Quick Access Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Stats */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Department Attendance Breakdown</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Real-time attendance rates across business units</p>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {data?.departmentStats?.length || 0} Dept{(data?.departmentStats?.length || 0) !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {(data?.departmentStats || []).map((dept, i) => {
              const rate = dept.total > 0 ? Math.round((dept.present / dept.total) * 100) : 0;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800">{dept.department}</span>
                    <span className="text-slate-500">
                      {dept.present} / {dept.total} Present ({rate}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${rate}%` }}
                      className={`h-full transition-all duration-500 ${
                        rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
            {(!data?.departmentStats || data.departmentStats.length === 0) && (
              <p className="text-xs text-slate-400 text-center py-6">No department data recorded for this date.</p>
            )}
          </div>
        </div>

        {/* Quick Action & Policy Overview */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Live Management Shortcuts</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Direct access to attendance management tools</p>

            <div className="space-y-2.5 mt-4">
              <button
                onClick={() => nav("live")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 text-xs font-bold text-slate-700 hover:text-indigo-600 transition cursor-pointer group"
              >
                <span className="flex items-center gap-2.5">
                  <PlayCircle className="h-4 w-4 text-emerald-500" />
                  <span>Real-time Live Attendance Board</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600" />
              </button>

              <button
                onClick={() => nav("wfh")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 text-xs font-bold text-slate-700 hover:text-indigo-600 transition cursor-pointer group"
              >
                <span className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                  <span>WFH Requests</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                  {kpis.pendingWfh || 0} Pending
                </span>
              </button>

              <button
                onClick={() => nav("regularization")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 text-xs font-bold text-slate-700 hover:text-indigo-600 transition cursor-pointer group"
              >
                <span className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-[#5D5FEF]" />
                  <span>Regularization Requests</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                  {kpis.pendingRegularizations || 0} Pending
                </span>
              </button>

              <button
                onClick={() => nav("exceptions")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50/40 text-xs font-bold text-slate-700 hover:text-red-600 transition cursor-pointer group"
              >
                <span className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>Audit Attendance Exceptions</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-100 text-orange-800 border border-orange-200">
                  {kpis.attendanceExceptions || 0} Open
                </span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-800">Organization Shift Standard</p>
            <p>General Shift: 09:00 AM - 06:00 PM (8h net work required, 15m late grace period).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
