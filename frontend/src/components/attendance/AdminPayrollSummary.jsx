import React, { useState, useEffect } from "react";
import { 
  DollarSign, 
  Lock, 
  Unlock, 
  Calendar, 
  Download, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldCheck,
  Filter
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminPayrollSummary() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState({ payrollSummary: [], period: null });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lockModal, setLockModal] = useState(false);
  const [unlockModal, setUnlockModal] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const [year, month] = currentMonth.split("-");
      const res = await attendanceService.getAdminPayrollSummary({
        year: parseInt(year),
        month: parseInt(month)
      });
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        const d = payload.data || payload;
        setData({
          payrollSummary: d.payrollSummary || d.summary || [],
          period: d.period || null
        });
      }
    } catch (err) {
      console.error("Failed to load payroll summary", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [currentMonth]);

  const handleFinalizePeriod = async () => {
    try {
      setSubmitting(true);
      const [year, month] = currentMonth.split("-");
      await attendanceService.finalizePayrollPeriod({
        year: parseInt(year),
        month: parseInt(month),
        notes: reason || "Payroll period finalized by Admin"
      });
      setLockModal(false);
      setReason("");
      fetchSummary();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to finalize payroll period");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlockPeriod = async () => {
    if (!reason.trim()) {
      alert("Please provide a mandatory audit reason to unlock this finalized period.");
      return;
    }
    try {
      setSubmitting(true);
      const [year, month] = currentMonth.split("-");
      await attendanceService.unlockPayrollPeriod({
        year: parseInt(year),
        month: parseInt(month),
        reason
      });
      setUnlockModal(false);
      setReason("");
      fetchSummary();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to unlock payroll period");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = (data.payrollSummary || []).filter((e) =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const exportPayrollCSV = () => {
    if (!filteredEmployees.length) return;
    const headers = [
      "Employee Name", "Email", "Department", "Total Calendar Days", "Present Days",
      "WFH Days", "Half Days", "Absent / Unpaid", "Paid Leave", "Total Payable Days",
      "Total Work Hours", "Total OT Hours", "Late Marks"
    ];

    const rows = filteredEmployees.map(e => [
      `"${e.name || ''}"`,
      `"${e.email || ''}"`,
      `"${e.department || 'General'}"`,
      e.totalDaysInMonth || 30,
      e.presentDays || 0,
      e.wfhDays || 0,
      e.halfDays || 0,
      e.absentDays || 0,
      e.leaveDays || 0,
      e.payableDays || 0,
      (e.totalWorkHours || 0).toFixed(2),
      ((e.totalOvertimeMinutes || 0) / 60).toFixed(2),
      e.lateMarks || 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Payroll_Attendance_Summary_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLocked = data.period?.isFinalized;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-800">Payroll Attendance Reconciliation</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile total payable days, overtime hours, unpaid leaves, and lock finalized attendance periods.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500"
          />

          {isLocked ? (
            <button
              onClick={() => setUnlockModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 text-amber-700 border border-amber-300 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors"
            >
              <Unlock className="w-3.5 h-3.5" />
              Unlock Period
            </button>
          ) : (
            <button
              onClick={() => setLockModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              Finalize & Lock Period
            </button>
          )}

          <button
            onClick={exportPayrollCSV}
            disabled={filteredEmployees.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export Payroll Sheet
          </button>
        </div>
      </div>

      {/* Lock Status Banner */}
      {isLocked ? (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900 uppercase">Period Finalized & Locked</h4>
              <p className="text-xs text-emerald-700">
                Attendance logs for {currentMonth} are locked for payroll. Finalized on{" "}
                {new Date(data.period?.finalizedAt).toLocaleDateString()}.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-900 uppercase">Period Open for Adjustments</h4>
            <p className="text-xs text-amber-700">
              Attendance records for {currentMonth} can still be regularized and modified until finalized.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <input
            type="text"
            placeholder="Search employee by name, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <span className="text-xs text-slate-500 font-medium">
            {filteredEmployees.length} employee records calculated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-3 py-3.5 text-center">Present</th>
                <th className="px-3 py-3.5 text-center">WFH</th>
                <th className="px-3 py-3.5 text-center">Half-Days</th>
                <th className="px-3 py-3.5 text-center">Leaves</th>
                <th className="px-3 py-3.5 text-center">Absent</th>
                <th className="px-4 py-3.5 text-center font-bold text-slate-800">Total Payable Days</th>
                <th className="px-4 py-3.5 text-center">Total Work Hrs</th>
                <th className="px-4 py-3.5 text-center">Overtime (Hrs)</th>
                <th className="px-3 py-3.5 text-center">Late Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="11" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Calculating payroll reconciliation...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-10 text-slate-400 text-xs">
                    No employee records found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((e) => (
                  <tr key={e.userId} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{e.name}</div>
                      <div className="text-xs text-slate-400">{e.email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{e.department || "General"}</td>
                    <td className="px-3 py-3.5 text-center text-xs font-semibold text-emerald-600">{e.presentDays || 0}</td>
                    <td className="px-3 py-3.5 text-center text-xs font-semibold text-blue-600">{e.wfhDays || 0}</td>
                    <td className="px-3 py-3.5 text-center text-xs font-semibold text-amber-600">{e.halfDays || 0}</td>
                    <td className="px-3 py-3.5 text-center text-xs text-purple-600">{e.leaveDays || 0}</td>
                    <td className="px-3 py-3.5 text-center text-xs font-semibold text-rose-600">{e.absentDays || 0}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        {e.payableDays || 0} days
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-xs text-slate-800">
                      {(e.totalWorkHours || 0).toFixed(1)}h
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs font-semibold text-indigo-600">
                      {((e.totalOvertimeMinutes || 0) / 60).toFixed(1)}h
                    </td>
                    <td className="px-3 py-3.5 text-center text-xs font-bold text-rose-600">
                      {e.lateMarks || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lock Modal */}
      {lockModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Finalize & Lock Attendance Period</h3>
            <p className="text-xs text-slate-500">
              Locking {currentMonth} will mark all included attendance records as finalized for payroll. Future regularization requests for this period will be restricted.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Finalization Notes
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Approved for salary processing..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setLockModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizePeriod}
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                {submitting ? "Locking..." : "Confirm & Lock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {unlockModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Unlock Attendance Period</h3>
            <p className="text-xs text-rose-600 font-medium">
              Warning: Unlocking allows modifications to finalized payroll data. An immutable audit log entry will be recorded.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Mandatory Unlock Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                placeholder="Explain why this finalized period is being reopened..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setUnlockModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlockPeriod}
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold rounded-xl text-white bg-amber-600 hover:bg-amber-700 transition-colors"
              >
                {submitting ? "Unlocking..." : "Confirm Unlock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
