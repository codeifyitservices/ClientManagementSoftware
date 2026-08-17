import React, { useState } from "react";
import {
  LayoutDashboard,
  ListFilter,
  FileSpreadsheet,
  Monitor,
  Plus,
  ShieldCheck,
} from "lucide-react";
import AttendanceWorkflowBar from "./AttendanceWorkflowBar";
import AttendanceDashboard from "./AttendanceDashboard";
import AttendanceTable from "./AttendanceTable";
import AttendanceReports from "./AttendanceReports";
import AttendanceDetailsModal from "./AttendanceDetailsModal";
import ManualAttendanceModal from "./ManualAttendanceModal";
import AgentPairingModal from "./AgentPairingModal";
import EmployeeAttendanceDashboard from "./EmployeeAttendanceDashboard";
import AttendanceSecurityAdmin from "./AttendanceSecurityAdmin";

export default function AttendancePage({ currentUser }) {
  const isManager = currentUser?.role !== "Employee";

  if (!isManager) {
    return <EmployeeAttendanceDashboard currentUser={currentUser} />;
  }

  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showAgentPairingModal, setShowAgentPairingModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handleEditAttendance = (record) => {
    setSelectedRecord(record);
    setShowManualModal(true);
  };

  const handleStatusChanged = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "list", label: "Attendance Records", icon: ListFilter },
    ...(isManager
      ? [
          { id: "reports", label: "Reports & Analytics", icon: FileSpreadsheet },
          { id: "security", label: "Attendance Security", icon: ShieldCheck },
        ]
      : []),
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Page header — title + grouped primary actions ─────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Attendance Management
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Real-time attendance tracking, desktop agent activity monitoring,
            and reporting
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => setShowAgentPairingModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer border border-slate-200 bg-white shadow-sm"
          >
            <Monitor className="h-4 w-4 text-[#5D5FEF]" />
            <span className="hidden sm:inline">Pair Desktop Agent</span>
          </button>

          {isManager && (
            <button
              onClick={() => {
                setSelectedRecord(null);
                setShowManualModal(true);
              }}
              className="flex items-center gap-2 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-500/20 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Manual Attendance Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sticky Employee Check-In & Action Workflow Bar — the primary daily action ── */}
      <AttendanceWorkflowBar
        currentUser={currentUser}
        onStatusChanged={handleStatusChanged}
        onOpenAgentPairing={() => setShowAgentPairingModal(true)}
      />

      {/* ── Content switcher — pill tabs, separated from page-level actions ── */}
      <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm w-fit">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#5D5FEF] text-white shadow-sm shadow-indigo-500/20"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div>
        {activeTab === "dashboard" && (
          <AttendanceDashboard currentUser={currentUser} />
        )}

        {activeTab === "list" && (
          <AttendanceTable
            currentUser={currentUser}
            onViewDetails={handleViewDetails}
            onEditAttendance={handleEditAttendance}
          />
        )}

        {activeTab === "reports" && <AttendanceReports />}

        {activeTab === "security" && <AttendanceSecurityAdmin currentUser={currentUser} />}
      </div>

      {/* Modals */}
      {showDetailsModal && (
        <AttendanceDetailsModal
          record={selectedRecord}
          onClose={() => setShowDetailsModal(false)}
          onRequestCorrectionRefresh={handleStatusChanged}
        />
      )}

      {showManualModal && (
        <ManualAttendanceModal
          record={selectedRecord}
          onClose={() => setShowManualModal(false)}
          onRefresh={handleStatusChanged}
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
