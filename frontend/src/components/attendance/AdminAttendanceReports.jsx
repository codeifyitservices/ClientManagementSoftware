import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  Clock, 
  Users, 
  TrendingUp,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  X
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminAttendanceReports() {
  const [reportType, setReportType] = useState("attendance_summary");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [department, setDepartment] = useState("all");
  const [departments, setDepartments] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getAdminReportsData({
        reportType,
        startDate,
        endDate,
        department: department !== "all" ? department : undefined
      });
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        const d = payload.data || payload;
        setReportData(d.records || []);
        setSummary(d.summary || {});
        setDepartments(d.departments || []);
      }
    } catch (err) {
      console.error("Failed to generate report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    setSelectedIds([]);
  }, [reportType, startDate, endDate, department]);

  const toggleSelectAll = () => {
    if (selectedIds.length === reportData.length && reportData.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reportData.map((r) => r._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    try {
      setBulkDeleting(true);
      await attendanceService.bulkDeleteAdminRecords(selectedIds);
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      fetchReport();
    } catch (err) {
      console.error("Failed to delete attendance report records", err);
      alert(err.response?.data?.message || "Failed to delete selected records");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData.length) return;
    let headers = [];
    let rows = [];

    if (reportType === "overtime") {
      headers = ["Date", "Employee", "Department", "Work Hours", "Overtime (Mins)", "Overtime (Hrs)"];
      rows = reportData.map(r => [
        r.date ? new Date(r.date).toISOString().split("T")[0] : "",
        `"${r.user?.name || ''}"`,
        `"${r.user?.department || 'General'}"`,
        r.totalHours || 0,
        r.overtimeMinutes || 0,
        ((r.overtimeMinutes || 0) / 60).toFixed(2)
      ]);
    } else if (reportType === "punctuality") {
      headers = ["Date", "Employee", "Department", "Clock In", "Late Minutes", "Early Checkout Mins", "Status"];
      rows = reportData.map(r => [
        r.date ? new Date(r.date).toISOString().split("T")[0] : "",
        `"${r.user?.name || ''}"`,
        `"${r.user?.department || 'General'}"`,
        r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString() : "",
        r.lateMinutes || 0,
        r.earlyCheckoutMinutes || 0,
        `"${r.status || ''}"`
      ]);
    } else {
      headers = ["Date", "Employee", "Department", "Status", "Mode", "Clock In", "Clock Out", "Total Hours", "Breaks (Mins)", "Late", "OT (Mins)"];
      rows = reportData.map(r => [
        r.date ? new Date(r.date).toISOString().split("T")[0] : "",
        `"${r.user?.name || ''}"`,
        `"${r.user?.department || 'General'}"`,
        `"${r.status || ''}"`,
        `"${r.locationMode || 'Office'}"`,
        r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString() : "",
        r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString() : "",
        r.totalHours || 0,
        r.totalBreakMinutes || 0,
        r.isLate ? "Yes" : "No",
        r.overtimeMinutes || 0
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${reportType}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const isAllSelected = reportData.length > 0 && selectedIds.length === reportData.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Attendance Intelligence & Export Reports</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate analytical attendance reports, overtime logs, and punctuality summaries for auditing and payroll.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>
          <button
            onClick={handleExportCSV}
            disabled={reportData.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV ({reportData.length})
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Report Category</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 font-semibold"
          >
            <option value="attendance_summary">Master Attendance Summary</option>
            <option value="working_hours">Working Hours & Shortfall</option>
            <option value="overtime">Overtime (OT) Report</option>
            <option value="punctuality">Late Arrivals & Early Leavers</option>
            <option value="wfh">WFH & Remote Analytics</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Records</span>
          <div className="text-xl font-bold text-slate-800 mt-1">{reportData.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Avg Work Hours</span>
          <div className="text-xl font-bold text-indigo-600 mt-1">{(summary.avgWorkHours || 0).toFixed(1)}h</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Overtime Logged</span>
          <div className="text-xl font-bold text-purple-600 mt-1">{summary.totalOvertimeHours || 0} hrs</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Late Arrivals Count</span>
          <div className="text-xl font-bold text-rose-600 mt-1">{summary.lateCount || 0}</div>
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold text-indigo-900">
              {selectedIds.length} record{selectedIds.length === 1 ? "" : "s"} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Deselect All
            </button>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all shadow-red-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Report Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                    title={isAllSelected ? "Deselect all" : "Select all visible"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Mode / Shift</th>
                <th className="px-4 py-3.5">Clock In / Out</th>
                <th className="px-4 py-3.5">Net Hours</th>
                <th className="px-4 py-3.5">Breaks</th>
                <th className="px-4 py-3.5">Late / OT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Generating report data...
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400 text-sm">
                    No records found for the selected report filters.
                  </td>
                </tr>
              ) : (
                reportData.map((r) => {
                  const isSelected = selectedIds.includes(r._id);
                  const empName = r.employee?.fullName || r.user?.name || r.user?.fullName || r.name || "Unknown";
                  const empDept = r.employee?.department || r.user?.department || "General";
                  const inTime = r.checkInTime || r.clockInTime;
                  const outTime = r.checkOutTime || r.clockOutTime;
                  const netHours = r.totalHours !== undefined ? r.totalHours : (r.totalWorkingMinutes ? r.totalWorkingMinutes / 60 : 0);

                  return (
                    <tr 
                      key={r._id} 
                      className={`hover:bg-slate-50 transition-colors ${isSelected ? "bg-indigo-50/40" : ""}`}
                    >
                      <td className="w-10 px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(r._id)}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap text-xs">
                        {r.date ? new Date(r.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "--"}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{empName}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{empDept}</td>
                      <td className="px-4 py-3.5 text-xs">{r.locationMode || (r.isRemote ? "WFH" : "Office")}</td>
                      <td className="px-4 py-3.5 text-xs font-mono">
                        {inTime ? new Date(inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--"} → {outTime ? new Date(outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--"}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-xs text-slate-800">{Number(netHours).toFixed(2)}h</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{r.totalBreakMinutes || 0} mins</td>
                      <td className="px-4 py-3.5 text-xs">
                        {r.isLate && <span className="text-rose-600 font-semibold mr-2">Late +{r.lateMinutes}m</span>}
                        {r.overtimeMinutes > 0 && <span className="text-indigo-600 font-semibold">OT +{r.overtimeMinutes}m</span>}
                        {!r.isLate && !r.overtimeMinutes && <span className="text-slate-400">Normal</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Delete Attendance Records?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
              Are you sure you want to delete <strong className="text-red-600">{selectedIds.length}</strong> selected attendance record{selectedIds.length === 1 ? "" : "s"}? All associated punch logs and timeline data will be permanently removed.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-200 transition-all disabled:opacity-50 cursor-pointer"
              >
                {bulkDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete {selectedIds.length} {selectedIds.length === 1 ? "Record" : "Records"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
