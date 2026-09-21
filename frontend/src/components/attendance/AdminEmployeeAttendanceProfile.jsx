import React, { useState, useEffect } from "react";
import { 
  User, 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  MapPin, 
  Home, 
  Briefcase, 
  Search, 
  Eye, 
  RefreshCw, 
  Mail, 
  Building2, 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft,
  BarChart3,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle,
  X
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminEmployeeAttendanceProfile({ onSelectRecord }) {
  const [employees, setEmployees] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [search, setSearch] = useState("");

  // Multiselect & Delete State
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await attendanceService.getEmployeesList({ limit: 500 });
      const list = res?.data || res?.employees || (Array.isArray(res) ? res : []);
      if (list && list.length > 0) {
        setEmployees(list);
        if (!selectedUserId) {
          setSelectedUserId(list[0]._id || list[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load employees for attendance profile", err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchProfile = async () => {
    if (!selectedUserId) return;
    try {
      setLoading(true);
      const res = await attendanceService.getAdminEmployeeProfile(selectedUserId, {
        year: selectedYear,
      });
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        setProfileData(payload);
      }
    } catch (err) {
      console.error("Failed to load employee attendance profile", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      setSelectedIds([]);
      setCurrentPage(1);
      fetchProfile();
    }
  }, [selectedUserId, selectedYear]);

  const filteredEmployees = employees.filter((e) => {
    const name = e.fullName || e.name || "";
    const email = e.companyEmail || e.email || "";
    const dept = e.department || "";
    const empId = e.employeeId || "";
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || dept.toLowerCase().includes(q) || empId.toLowerCase().includes(q);
  });

  const emp = profileData?.employee;
  const stats = profileData?.stats || {};
  const records = profileData?.recentRecords || [];

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, records.length);
  const paginatedRecords = records.slice(startIndex, endIndex);

  // Selection Handlers
  const isAllCurrentPageSelected = paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedIds.includes(r._id));
  const isSomeCurrentPageSelected = paginatedRecords.some((r) => selectedIds.includes(r._id)) && !isAllCurrentPageSelected;

  const toggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(paginatedRecords.map((r) => r._id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const newSelected = new Set(selectedIds);
      paginatedRecords.forEach((r) => newSelected.add(r._id));
      setSelectedIds(Array.from(newSelected));
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
      // Valid MongoDB ObjectIds (24 hex characters) are deleted from the database
      const validDbIds = selectedIds.filter(
        (id) => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id)
      );

      if (validDbIds.length > 0) {
        await attendanceService.bulkDeleteAdminRecords(validDbIds);
      }

      setSelectedIds([]);
      setShowDeleteModal(false);
      await fetchProfile();
    } catch (err) {
      console.error("Failed to delete attendance profile records", err);
      alert(err.response?.data?.message || "Failed to delete selected records");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Selector & Filter Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 className="text-xl font-bold text-slate-800">Employee Attendance Profile</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive individual attendance performance, punch history, and remote work metrics.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          {/* Year Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-xl shrink-0 transition-colors">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Search & Employee Select */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-xl transition-colors min-w-[220px] sm:min-w-[260px] max-w-[320px]">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingEmployees}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-full truncate"
            >
              {filteredEmployees.map((e) => (
                <option key={e._id || e.id} value={e._id || e.id}>
                  {e.fullName || e.name} ({e.employeeId || e.department || "Staff"})
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchProfile}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shrink-0 disabled:opacity-50"
            title="Refresh profile data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading && !profileData ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading employee profile details...
        </div>
      ) : profileData ? (
        <div className="space-y-6">
          {/* Employee Header Overview Card */}
          {emp && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl">
                  {(emp.fullName || "E")[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-slate-900">{emp.fullName}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
                      {emp.employeeId || "Staff"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      {emp.status || "Active"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium mt-1.5">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {emp.department || "General"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {emp.designation || "Staff"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {emp.companyEmail || emp.email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance Rate</span>
                  <span className="text-xl font-black text-indigo-600">{stats.attendancePercentage || 0}%</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Working Hrs</span>
                  <span className="text-xl font-black text-slate-800">{stats.avgWorkingHours || "0.0"}h</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Logs ({selectedYear})</span>
                  <span className="text-xl font-black text-slate-800">{stats.totalRecordsCount || records.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Present Days</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{stats.presentDays || 0}</div>
              <span className="text-[10px] text-slate-400 font-medium">In office punches</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WFH Days</span>
              <div className="text-2xl font-black text-indigo-600 mt-1">{stats.wfhDays || 0}</div>
              <span className="text-[10px] text-slate-400 font-medium">Remote sessions</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Half Days</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{stats.halfDays || 0}</div>
              <span className="text-[10px] text-slate-400 font-medium">Partial shifts</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Absent / Leave</span>
              <div className="text-2xl font-black text-rose-600 mt-1">{(stats.absentDays || 0) + (stats.leaveDays || 0)}</div>
              <span className="text-[10px] text-slate-400 font-medium">Days missed</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Late Arrivals</span>
              <div className="text-2xl font-black text-orange-600 mt-1">{stats.lateArrivals || 0}</div>
              <span className="text-[10px] text-slate-400 font-medium">Post-grace check-ins</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overtime Logged</span>
              <div className="text-2xl font-black text-violet-600 mt-1">{stats.totalOvertimeHours || "0.0"}h</div>
              <span className="text-[10px] text-slate-400 font-medium">Extra hours</span>
            </div>
          </div>

          {/* Monthly Breakdown Chart Preview */}
          {profileData.monthlyBreakdown && profileData.monthlyBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-800">Monthly Attendance Breakdown ({selectedYear})</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Present / WFH Distribution</span>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-2">
                {profileData.monthlyBreakdown.map((m, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 block">{m.monthName}</span>
                    <div className="text-xs font-black text-indigo-600">{m.present}d</div>
                    <div className="text-[9px] font-bold text-slate-400">{(m.hours || 0).toFixed(0)}h</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-sm text-slate-800">
                  Attendance Punch Logs ({records.length} records)
                </h3>
                {selectedIds.length > 0 && (
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                    {selectedIds.length} Selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Selected ({selectedIds.length})
                    </button>
                    <button
                      onClick={() => setSelectedIds([])}
                      className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <span className="text-xs text-slate-400 font-medium">Year {selectedYear}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-b-2xl">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider select-none">
                  <tr>
                    <th className="px-3 py-3.5 w-12 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-slate-400 hover:text-indigo-600 transition flex items-center justify-center mx-auto cursor-pointer"
                        title={isAllCurrentPageSelected ? "Deselect Page" : "Select Page"}
                      >
                        {isAllCurrentPageSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : isSomeCurrentPageSelected ? (
                          <MinusSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Date</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Status</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Location</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Clock In</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Clock Out</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Work Hours</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Breaks</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Punctuality</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-12 text-slate-400 text-xs font-semibold">
                        No attendance records found for this employee in {selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r) => {
                      const isSelected = selectedIds.includes(r._id);
                      const dateStr = r.date ? new Date(r.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "--";
                      const rawIn = r.checkInTime || r.clockInTime;
                      const rawOut = r.checkOutTime || r.clockOutTime;
                      const inTime = rawIn ? new Date(rawIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
                      const outTime = rawOut ? new Date(rawOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
                      const totalMins = r.totalWorkingMinutes || 0;
                      const totalH = (totalMins / 60).toFixed(2);
                      const isAbsent = r.attendanceStatus === "Absent";

                      const getStatusBadge = () => {
                        const status = r.attendanceStatus || r.status || "Present";
                        if (status === "Present") {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              Present
                            </span>
                          );
                        }
                        if (status === "Late Check-In") {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200/80">
                              Late Check-In
                            </span>
                          );
                        }
                        if (status === "Absent") {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200/80">
                              Absent
                            </span>
                          );
                        }
                        if (status === "Half Day" || status === "On Leave") {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                              {status}
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-slate-100 text-slate-700 border border-slate-200">
                            {status}
                          </span>
                        );
                      };

                      return (
                        <tr key={r._id} className={`transition-colors font-medium ${isSelected ? "bg-indigo-50/40" : "hover:bg-slate-50/80"}`}>
                          <td className="px-3 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectOne(r._id)}
                              className="text-slate-400 hover:text-indigo-600 transition flex items-center justify-center mx-auto cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-800 whitespace-nowrap text-xs">
                            {dateStr}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            {getStatusBadge()}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap text-xs font-semibold text-slate-600">
                            {isAbsent ? (
                              <span className="text-slate-300 font-mono">—</span>
                            ) : r.locationMode === "WFH" || r.isRemote ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                WFH
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                                Office
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-xs font-bold">
                            {inTime ? (
                              <span className="text-slate-800">{inTime}</span>
                            ) : (
                              <span className="text-slate-300 font-normal">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-xs font-bold">
                            {outTime ? (
                              <span className="text-slate-800">{outTime}</span>
                            ) : (
                              <span className="text-slate-300 font-normal">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap text-xs font-bold">
                            {totalMins > 0 ? (
                              <span className="text-slate-900">{totalH} hrs</span>
                            ) : (
                              <span className="text-slate-400 font-semibold">0.00 hrs</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap text-xs text-slate-600 font-medium">
                            {isAbsent ? (
                              <span className="text-slate-300 font-mono">—</span>
                            ) : (
                              <span>{r.totalBreakMinutes || 0} mins ({r.breaks?.length || 0})</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap text-xs">
                            {isAbsent ? (
                              <span className="text-slate-300 font-mono">—</span>
                            ) : r.isLate ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                                Late (+{r.lateMinutes || 0}m)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                On Time
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap pr-6">
                            <button
                              onClick={() => onSelectRecord && onSelectRecord(r)}
                              className="px-2.5 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-bold rounded-lg transition cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {records.length > 0 && (
              <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span>
                    Showing <strong className="text-slate-700">{startIndex + 1}</strong> to{" "}
                    <strong className="text-slate-700">{endIndex}</strong> of{" "}
                    <strong className="text-slate-700">{records.length}</strong> records
                  </span>
                  <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
                    <span className="text-[11px] text-slate-400 font-medium">Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {[10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validPage <= 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - validPage) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && p - prev > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                            <button
                              onClick={() => setCurrentPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                                validPage === p
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage >= totalPages}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition cursor-pointer"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Attendance Records</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete <strong className="text-slate-800">{selectedIds.length}</strong> selected attendance log(s)? This action will remove the selected logs.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {bulkDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Delete
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
