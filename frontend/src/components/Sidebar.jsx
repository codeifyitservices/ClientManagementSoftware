import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Settings,
  Sliders,
  Database,
  CalendarDays,
  Folder,
  Briefcase,
  CheckSquare,
  Bug,
  Clock,
  TrendingUp,
} from "lucide-react";
import { attendanceService } from "../services/attendanceService";

export default function Sidebar({
  companyName = "Codenap IT Services",
  companyLogo = "",
  currentUser = null,
}) {
  const [pendingAttendanceCount, setPendingAttendanceCount] = useState(0);

  useEffect(() => {
    if (currentUser?.role === "Employee") return;

    const fetchPendingAttendance = async () => {
      try {
        const res = await attendanceService.getAdminDashboard();
        if (res?.success && res.kpis) {
          const total =
            (res.kpis.pendingWfh || 0) +
            (res.kpis.pendingRegularizations || 0) +
            (res.kpis.attendanceExceptions || 0);
          setPendingAttendanceCount(total);
        }
      } catch (err) {
        // silently ignore error on background count fetch
      }
    };

    fetchPendingAttendance();
    const interval = setInterval(fetchPendingAttendance, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const mainItems =
    currentUser?.role === "Employee"
      ? [
          { to: "/", name: "Dashboard", icon: LayoutDashboard, exact: true },
          { to: "/attendance", name: "Attendance", icon: Clock },
          { to: "/tasks", name: "Tasks", icon: CheckSquare },
          { to: "/tickets", name: "Bug Tickets", icon: Bug },
          { to: "/my-profile", name: "My Profile", icon: Briefcase },
        ]
      : [
          { to: "/", name: "Dashboard", icon: LayoutDashboard, exact: true },
          { to: "/clients", name: "Clients", icon: Users },
          { to: "/leads", name: "Leads", icon: TrendingUp },
          { to: "/projects", name: "Projects", icon: Folder },
          { to: "/invoices", name: "Invoices", icon: Receipt },
          { to: "/subscriptions", name: "Subscriptions", icon: CalendarDays },
          { to: "/employees", name: "Employees", icon: Briefcase },
          { to: "/attendance", name: "Attendance", icon: Clock },
          { to: "/tasks", name: "Tasks", icon: CheckSquare },
          { to: "/tickets", name: "Bug Tickets", icon: Bug },
        ];

  const settingItems = [
    { to: "/settings/profile", name: "Company Profile", icon: Settings },
    { to: "/settings/services", name: "Service Settings", icon: Sliders },
    { to: "/settings/backup", name: "Data Backup", icon: Database },
  ];

  const linkClass = ({ isActive }) =>
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
      isActive
        ? "bg-[#5D5FEF] text-white"
        : "text-slate-400 hover:bg-white/5 hover:text-white"
    }`;

  const iconClass = (isActive) =>
    `h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`;

  return (
    <aside className="w-56 bg-[#0B0C24] text-slate-400 h-screen sticky top-0 flex flex-col select-none shrink-0 border-r border-slate-900/50">
      {/* Brand Header */}
      <div className="py-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 px-5 mb-6">
          {companyLogo && (
            <div className="h-9 w-9 rounded-xl bg-white/95 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 overflow-hidden p-1">
              <img
                src={`${import.meta.env.VITE_BACKEND_URL}/uploads/${companyLogo}`}
                alt={companyName}
                className="h-full w-full object-contain"
              />
            </div>
          )}
          <div>
            <h2 className="text-sm font-bold text-white leading-tight tracking-tight break-words">
              {companyName}
            </h2>
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block mt-1">
              Invoice Management
            </span>
          </div>
        </div>

        {/* MAIN Menu */}
        <div className="mt-4">
          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-5 mb-2">
            MAIN
          </div>
          <nav className="space-y-0.5 px-2.5">
            {mainItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={linkClass}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={iconClass(isActive)} />
                      <span className="flex-1 text-left">{item.name}</span>
                      {item.to === "/attendance" && pendingAttendanceCount > 0 && currentUser?.role !== "Employee" && (
                        <span
                          className={`ml-auto px-1.5 py-0.5 min-w-[18px] text-[10px] font-black rounded-full text-center leading-none shadow-xs ${
                            isActive ? "bg-white text-[#5D5FEF]" : "bg-rose-500 text-white"
                          }`}
                        >
                          {pendingAttendanceCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* SETTINGS Menu */}
        {currentUser?.role !== "Employee" && (
          <div className="mt-6">
            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-5 mb-2">
              SETTINGS
            </div>
            <nav className="space-y-0.5 px-2.5">
              {settingItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} className={linkClass}>
                    {({ isActive }) => (
                      <>
                        <Icon className={iconClass(isActive)} />
                        <span>{item.name}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </aside>
  );
}
