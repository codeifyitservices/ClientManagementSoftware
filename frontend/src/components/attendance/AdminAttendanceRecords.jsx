import React, { useState, useEffect } from "react";
import { 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  Eye, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MapPin,
  Lock,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  X
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminAttendanceRecords({ onSelectRecord }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [shifts, setShifts] = useState([]);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("all");
  const [department, setDepartment] = useState("all");
  const [locationMode, setLocationMode] = useState("all");
  const [isLate, setIsLate] = useState("all");
  const [regularizationStatus, setRegularizationStatus] = useState("all");

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: status !== "all" ? status : undefined,
        department: department !== "all" ? department : undefined,
        locationMode: locationMode !== "all" ? locationMode : undefined,
        isLate: isLate !== "all" ? isLate : undefined,
        regularizationStatus: regularizationStatus !== "all" ? regularizationStatus : undefined,
        search: search.trim() || undefined
      };

      const res = await attendanceService.getAdminRecords(params);
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        const dataObj = payload?.data || payload;
        setRecords(dataObj.records || dataObj.data || []);
        setTotalRecords(dataObj.total || 0);
        setTotalPages(dataObj.pages || dataObj.totalPages || 1);
        setDepartments(dataObj.departments || []);
        setLocations(dataObj.locations || []);
        setShifts(dataObj.shifts || []);
      }
    } catch (err) {
      console.error("Failed to load attendance records", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    setSelectedIds([]);
  }, [page, startDate, endDate, status, department, locationMode, isLate, regularizationStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === records.length && records.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map((r) => r._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await attendanceService.bulkDeleteAdminRecords(selectedIds);
      if (res?.success) {
        setSelectedIds([]);
        setShowDeleteModal(false);
        fetchRecords();
      } else {
        alert(res?.message || "Failed to delete selected records");
      }
    } catch (err) {
      alert(err.response?.data?.message || err?.message || "Error deleting selected records");
    } finally {
      setBulkDeleting(false);
    }
  };

  const exportCSV = () => {
    if (!records.length) return;
    const headers = [
      "Date", "Employee Name", "Email", "Department", "Shift", "Location Mode",
      "Status", "Clock In", "Clock Out", "Total Hours", "Break Mins", "Is Late", "Late Mins",
      "Is Early Checkout", "Overtime Mins", "Regularization"
    ];

    const rows = records.map(r => [
      r.date ? new Date(r.date).toISOString().split("T")[0] : "",
      `"${r.user?.name || ''}"`,
      `"${r.user?.email || ''}"`,
      `"${r.user?.department || 'General'}"`,
      `"${r.shift || 'General'}"`,
      `"${r.locationMode || 'Office'}"`,
      `"${r.status || ''}"`,
      r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString() : "",
      r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString() : "",
      r.totalHours || 0,
      r.totalBreakMinutes || 0,
      r.isLate ? "Yes" : "No",
      r.lateMinutes || 0,
      r.isEarlyCheckout ? "Yes" : "No",
      r.overtimeMinutes || 0,
      r.regularizationStatus || "None"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_records_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (rec) => {
    const st = rec.attendanceStatus || rec.status;
    switch (st) {
      case "Present":
      case "Completed":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Present</span>;
      case "Half-Day":
      case "Half Day":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Half-Day</span>;
      case "Absent":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Absent</span>;
      case "On Leave":
      case "Leave":
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">On Leave</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">{st || "Not Checked In"}</span>;
    }
  };

  const isAllSelected = records.length > 0 && selectedIds.length === records.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Master Attendance Records</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse, filter, audit, and manage full employee attendance logs and punch history across all departments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm cursor-pointer animate-fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            disabled={!records.length}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by employee name, email, employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Completed">Completed</option>
              <option value="Half-Day">Half-Day</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Mode</label>
            <select
              value={locationMode}
              onChange={(e) => { setLocationMode(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Locations</option>
              <option value="Office">Office</option>
              <option value="WFH">WFH</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">Punctuality</label>
            <select
              value={isLate}
              onChange={(e) => { setIsLate(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Records</option>
              <option value="true">Late Arrivals Only</option>
              <option value="false">On-Time Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Selected Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50/90 border border-indigo-200 p-3 rounded-2xl flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-indigo-950 font-bold">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <span>{selectedIds.length} of {records.length} records selected on this page</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-indigo-100/60 transition cursor-pointer"
            >
              Deselect All
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
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
                <th className="px-4 py-3.5 min-w-[110px]">Date</th>
                <th className="px-5 py-3.5 min-w-[200px]">Employee</th>
                <th className="px-4 py-3.5 min-w-[120px]">Shift & Mode</th>
                <th className="px-4 py-3.5 min-w-[110px]">Status</th>
                <th className="px-4 py-3.5 min-w-[160px]">Clock In / Out</th>
                <th className="px-4 py-3.5 min-w-[140px]">Gross / Net Hours</th>
                <th className="px-4 py-3.5 min-w-[120px]">Breaks</th>
                <th className="px-4 py-3.5 min-w-[130px]">Punctuality & OT</th>
                <th className="px-4 py-3.5 text-right min-w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading attendance records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400">
                    No attendance records found matching the criteria.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const dateStr = r.date ? new Date(r.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "--";
                  const rawIn = r.checkInTime || r.clockInTime;
                  const rawOut = r.checkOutTime || r.clockOutTime;
                  const inTime = rawIn ? new Date(rawIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                  const outTime = rawOut ? new Date(rawOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                  const empName = r.employee?.fullName || r.user?.name || r.user?.fullName || r.name || "Unknown";
                  const empDept = r.employee?.department || r.user?.department || "General";
                  const netHours = r.totalHours !== undefined ? r.totalHours : (r.totalWorkingMinutes ? r.totalWorkingMinutes / 60 : 0);
                  const isSelected = selectedIds.includes(r._id);

                  return (
                    <tr
                      key={r._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
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

                      <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{empName}</div>
                        <div className="text-xs text-slate-400">{empDept}</div>
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-medium text-slate-700">{r.locationMode || (r.isRemote ? "WFH" : "Office")}</span>
                        <div className="text-slate-400">{r.shift || "General"}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        {getStatusBadge(r)}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-mono whitespace-nowrap">
                        <span className="text-emerald-700 font-medium">{inTime}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="text-slate-700 font-medium">{outTime}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800 text-xs">{Number(netHours).toFixed(2)}h Net</div>
                        <div className="text-[11px] text-slate-400">{(r.grossHours || netHours || 0).toFixed(2)}h Gross</div>
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-medium text-slate-700">{r.totalBreakMinutes || 0} mins</span>
                        <div className="text-slate-400 text-[11px]">({r.breaks?.length || 0} breaks)</div>
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        <div className="flex flex-col gap-0.5">
                          {r.isLate ? (
                            <span className="text-rose-600 font-semibold text-[11px]">Late +{r.lateMinutes || 0}m</span>
                          ) : (
                            <span className="text-emerald-600 text-[11px]">On-Time</span>
                          )}
                          {r.overtimeMinutes > 0 && (
                            <span className="text-indigo-600 font-semibold text-[11px]">OT +{r.overtimeMinutes}m</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => onSelectRecord && onSelectRecord(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-5 py-3.5 border-t border-slate-200 bg-slate-50/50 gap-3">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{records.length ? (page - 1) * limit + 1 : 0}</span> to{" "}
            <span className="font-semibold text-slate-700">{Math.min(page * limit, totalRecords)}</span> of{" "}
            <span className="font-semibold text-slate-700">{totalRecords}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-700 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {selectedIds.length} Attendance Record{selectedIds.length > 1 ? "s" : ""}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>
                You are about to permanently delete <strong>{selectedIds.length}</strong> selected attendance log{selectedIds.length > 1 ? "s" : ""}.
              </p>
              <p className="text-slate-500">
                Associated time entries, break records, and audit events for these dates will be removed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {bulkDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
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
