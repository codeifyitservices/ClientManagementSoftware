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
  Lock
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminAttendanceRecords({ onSelectRecord }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [shifts, setShifts] = useState([]);
  
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
  }, [page, startDate, endDate, status, department, locationMode, isLate, regularizationStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
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
    link.setAttribute("download", `Attendance_Records_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (r) => {
    switch (r.status) {
      case "Present":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Present</span>;
      case "Completed":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Completed</span>;
      case "Half-Day":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Half Day</span>;
      case "Absent":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Absent</span>;
      case "On Leave":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">On Leave</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{r.status || "Unknown"}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Master Attendance Records</h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse, search, and audit all employee daily attendance logs, work hours, breaks, and compliance records.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV ({totalRecords})
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by employee name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-50 text-indigo-600 font-medium text-xs rounded-xl hover:bg-indigo-100 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
            />
          </div>

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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Shift & Mode</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Clock In / Out</th>
                <th className="px-4 py-3.5">Gross / Net Hours</th>
                <th className="px-4 py-3.5">Breaks</th>
                <th className="px-4 py-3.5">Punctuality & OT</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading attendance records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400">
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

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap">
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

                      <td className="px-4 py-3.5 text-xs font-mono">
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors"
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
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-700 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
