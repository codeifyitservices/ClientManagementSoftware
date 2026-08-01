import React, { useState, useEffect } from "react";
import { Users, UserCheck, UserX, Coffee, Laptop, Clock, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { attendanceService } from "../../services/attendanceService";

export default function AttendanceDashboard({ currentUser }) {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [isEmployeeView, setIsEmployeeView] = useState(currentUser?.role === "Employee");
  const [loading, setLoading] = useState(true);

  const fetchSummaryData = async () => {
    try {
      const res = await attendanceService.getSummary();
      if (res.success) {
        setSummary(res.summary);
        setTrends(res.trends);
        if (res.isEmployeeView !== undefined) {
          setIsEmployeeView(res.isEmployeeView);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
    const interval = setInterval(fetchSummaryData, 1500); // Fast 1.5s polling for instant UI status sync
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-32 bg-slate-100 rounded-2xl border border-slate-200"></div>
        ))}
      </div>
    );
  }

  // Employee Specific Personal Cards
  const employeeCards = [
    {
      title: "My Work Hours Today",
      value: `${summary?.myWorkingHoursToday || "0.0"} hrs`,
      subtext: "Calculated active working duration",
      icon: Clock,
      badge: "Today",
    },
    {
      title: "My Break Time Today",
      value: `${summary?.myBreakMinutesToday || 0} mins`,
      subtext: "Total break duration taken today",
      icon: Coffee,
      badge: "Break",
    },
    {
      title: "My Check-In Time",
      value: summary?.myCheckInTime ? new Date(summary.myCheckInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not Checked In",
      subtext: summary?.myCheckOutTime ? `Checked out: ${new Date(summary.myCheckOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Active session",
      icon: Calendar,
      badge: "CheckIn",
    },
    {
      title: "Current Status",
      value: summary?.myStatus || "Not Checked In",
      subtext: `Attendance: ${summary?.myAttendanceStatus || "Absent"}`,
      icon: UserCheck,
      badge: "Status",
    },
    {
      title: "My Monthly Hours",
      value: `${summary?.myMonthlyHours || "0.0"} hrs`,
      subtext: "Total hours worked this month",
      icon: TrendingUp,
      badge: "Monthly",
    },
    {
      title: "My Late Check-Ins",
      value: summary?.myLateCheckIns || 0,
      subtext: "Late check-ins recorded this month",
      icon: AlertCircle,
      badge: "Record",
    },
  ];

  // Admin Company Wide Cards
  const adminCards = [
    {
      title: "Employees Present",
      value: summary?.presentToday || 0,
      subtext: `Out of ${summary?.totalEmployees || 0} Total`,
      icon: UserCheck,
      badge: `${summary?.totalEmployees ? Math.round(((summary.presentToday || 0) / summary.totalEmployees) * 100) : 0}%`,
    },
    {
      title: "Employees Absent",
      value: summary?.absentToday || 0,
      subtext: "Not checked in today",
      icon: UserX,
      badge: "Action Req",
    },
    {
      title: "Currently On Break",
      value: summary?.onBreakToday || 0,
      subtext: "Temporary break status",
      icon: Coffee,
      badge: "Break",
    },
    {
      title: "Working Remotely",
      value: summary?.remoteToday || 0,
      subtext: "Remote attendance sessions",
      icon: Laptop,
      badge: "Remote",
    },
    {
      title: "Checked In Today",
      value: summary?.checkedInToday || 0,
      subtext: `${summary?.checkedOutToday || 0} already checked out`,
      icon: Users,
      badge: "Active",
    },
    {
      title: "Avg Working Hours",
      value: `${summary?.avgWorkingHoursToday || "0.0"} hrs`,
      subtext: "Average per employee today",
      icon: Clock,
      badge: "Hours",
    },
  ];

  const statCards = isEmployeeView ? employeeCards : adminCards;

  const chartData = [
    { name: "Today", count: trends?.todayCount || 0 },
    { name: "This Week", count: trends?.weekCount || 0 },
    { name: "This Month", count: trends?.monthCount || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard Title & Badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">
          {isEmployeeView ? "My Personal Attendance Summary" : "Company Attendance Overview"}
        </h2>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-[#5D5FEF] border border-indigo-100">
          {isEmployeeView ? "Employee Personal View" : "Admin Management View"}
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#5D5FEF]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-[#5D5FEF] border border-indigo-100">
                  {card.badge}
                </span>
              </div>
              <div className="text-xl font-black text-slate-900 tracking-tight">{card.value}</div>
              <div className="text-xs font-bold text-slate-700 mt-1">{card.title}</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">{card.subtext}</div>
            </div>
          );
        })}
      </div>

      {/* Attendance Trends Graph */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-slate-900 font-extrabold text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#5D5FEF]" />
              <span>{isEmployeeView ? "My Attendance Logged Days" : "Attendance Volume Trends"}</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isEmployeeView
                ? "Total attendance sessions recorded for your account"
                : "Summary of attendance session volume across all employees"}
            </p>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} />
              <YAxis stroke="#64748b" tick={{ fontSize: 12 }} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", color: "#0f172a", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                cursor={{ fill: "rgba(93, 95, 239, 0.05)" }}
              />
              <Bar dataKey="count" fill="#5D5FEF" radius={[8, 8, 0, 0]} barSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
