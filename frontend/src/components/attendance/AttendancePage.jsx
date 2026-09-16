import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Radio,
  ListFilter,
  Calendar,
  Home,
  Clock,
  AlertTriangle,
  UserCheck,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  Monitor,
  Plus,
  Layers
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

import EmployeeAttendanceDashboard from "./EmployeeAttendanceDashboard";
import AdminAttendanceDashboard from "./AdminAttendanceDashboard";
import AdminLiveAttendance from "./AdminLiveAttendance";
import AdminAttendanceRecords from "./AdminAttendanceRecords";
import AdminAttendanceCalendar from "./AdminAttendanceCalendar";
import AdminWfhRequests from "./AdminWfhRequests";
import AdminRegularizationRequests from "./AdminRegularizationRequests";
import AdminAttendanceExceptions from "./AdminAttendanceExceptions";
import AdminEmployeeAttendanceProfile from "./AdminEmployeeAttendanceProfile";
import AdminAttendanceReports from "./AdminAttendanceReports";
import AdminAttendanceConfiguration from "./AdminAttendanceConfiguration";
import AdminAttendanceAuditLog from "./AdminAttendanceAuditLog";
import AdminAttendanceDetailDrawer from "./AdminAttendanceDetailDrawer";
import ManualAttendanceModal from "./ManualAttendanceModal";
import AgentPairingModal from "./AgentPairingModal";

export default function AttendancePage({ currentUser }) {
  const isManager = currentUser?.role !== "Employee";

  // STRICT RULE: Do not change employee-side UI
  if (!isManager) {
    return <EmployeeAttendanceDashboard currentUser={currentUser} />;
  }

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showAgentPairingModal, setShowAgentPairingModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState({
    wfh: 0,
    regularization: 0,
    exceptions: 0,
  });

  const fetchBadgeCounts = async () => {
    try {
      const res = await attendanceService.getAdminDashboard();
      if (res?.success && res.kpis) {
        setBadgeCounts({
          wfh: res.kpis.pendingWfh || 0,
          regularization: res.kpis.pendingRegularizations || 0,
          exceptions: res.kpis.attendanceExceptions || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load attendance badge counts", err);
    }
  };

  useEffect(() => {
    if (isManager) {
      fetchBadgeCounts();
      const interval = setInterval(fetchBadgeCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [isManager, refreshKey, activeTab]);

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "live", label: "Live Monitor", icon: Radio },
    { id: "records", label: "Master Records", icon: ListFilter },
    { id: "calendar", label: "Calendar View", icon: Calendar },
    { id: "wfh", label: "WFH Requests", icon: Home, count: badgeCounts.wfh, badgeColor: "bg-amber-500 text-white" },
    { id: "regularization", label: "Regularization", icon: Clock, count: badgeCounts.regularization, badgeColor: "bg-rose-500 text-white" },
    { id: "exceptions", label: "Exceptions", icon: AlertTriangle, count: badgeCounts.exceptions, badgeColor: "bg-orange-500 text-white" },
    { id: "profiles", label: "Employee Profile", icon: UserCheck },
    { id: "reports", label: "Reports & Analytics", icon: FileSpreadsheet },
    { id: "config", label: "Shift & Geofence Policy", icon: Settings },
    { id: "audit", label: "Audit Trail", icon: ShieldCheck },
  ];

  const handleRecordSelected = (record) => {
    setSelectedRecord(record);
  };

  const handleManualRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Enterprise Attendance Administration
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Live monitoring, approvals, exception detection, and shift & geofence policies
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAgentPairingModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer border border-slate-200 bg-white shadow-sm"
          >
            <Monitor className="h-4 w-4 text-indigo-600" />
            <span>Pair Agent</span>
          </button>

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm shadow-indigo-500/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Manual Attendance Punch</span>
          </button>
        </div>
      </div>

      {/* ── Navigation Pill Tabs ─────────────────────────────────── */}
      <div className="overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm min-w-max">
          {tabs.map(({ id, label, icon: Icon, count, badgeColor }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 min-w-[18px] text-[10px] font-black rounded-full text-center leading-tight shadow-xs ${
                      isActive
                        ? "bg-white text-indigo-700"
                        : badgeColor || "bg-rose-500 text-white"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────── */}
      <div key={refreshKey}>
        {activeTab === "overview" && (
          <AdminAttendanceDashboard 
            onNavigate={(tab) => setActiveTab(tab)} 
            onSelectRecord={handleRecordSelected} 
          />
        )}

        {activeTab === "live" && (
          <AdminLiveAttendance onSelectRecord={handleRecordSelected} />
        )}

        {activeTab === "records" && (
          <AdminAttendanceRecords onSelectRecord={handleRecordSelected} />
        )}

        {activeTab === "calendar" && (
          <AdminAttendanceCalendar onSelectRecord={handleRecordSelected} />
        )}

        {activeTab === "wfh" && (
          <AdminWfhRequests />
        )}

        {activeTab === "regularization" && (
          <AdminRegularizationRequests onSelectRecord={handleRecordSelected} />
        )}

        {activeTab === "exceptions" && (
          <AdminAttendanceExceptions onSelectRecord={handleRecordSelected} />
        )}

        {activeTab === "profiles" && (
          <AdminEmployeeAttendanceProfile onSelectRecord={handleRecordSelected} />
        )}

        {activeTab === "reports" && (
          <AdminAttendanceReports />
        )}

        {activeTab === "config" && (
          <AdminAttendanceConfiguration />
        )}

        {activeTab === "audit" && (
          <AdminAttendanceAuditLog />
        )}
      </div>

      {/* ── Slide-Over Detail Drawer ─────────────────────────────── */}
      {selectedRecord && (
        <AdminAttendanceDetailDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────── */}
      {showManualModal && (
        <ManualAttendanceModal
          record={null}
          onClose={() => setShowManualModal(false)}
          onRefresh={handleManualRefresh}
        />
      )}

      {showAgentPairingModal && (
        <AgentPairingModal
          currentUser={currentUser}
          onClose={() => setShowAgentPairingModal(false)}
        />
      )}
    </div>
  );
}
