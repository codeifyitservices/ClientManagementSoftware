import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  Download,
  Eye,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Shield,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AttendanceTable({
  currentUser,
  onViewDetails,
  onEditAttendance,
}) {
  const isEmployee = currentUser?.role === "Employee";
  const [viewMode, setViewMode] = useState(isEmployee ? "calendar" : "list"); // Default to calendar for Employees
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Table view state
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  // Calendar view state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [monthlyRecordsMap, setMonthlyRecordsMap] = useState({});

  // ── Fetch List / Table Data ────────────────────────────────────────────────
  const fetchAttendanceList = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await attendanceService.getList({
        search: isEmployee ? "" : search,
        department: isEmployee ? "All" : departmentFilter,
        status: statusFilter,
        date: selectedDate,
        page,
        limit: 10,
      });
      if (res.success) {
        setRecords(res.records);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error("Failed to load attendance list", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // ── Fetch Calendar Month Data ──────────────────────────────────────────────
  const fetchCalendarMonthData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const firstDayStr = new Date(year, month, 1).toISOString().split("T")[0];
      const lastDayStr = new Date(year, month + 1, 0)
        .toISOString()
        .split("T")[0];

      const res = await attendanceService.getReports({
        startDate: firstDayStr,
        endDate: lastDayStr,
      });

      if (res.success && res.rows) {
        // Also fetch details for list mapping
        const listRes = await attendanceService.getList({
          date: firstDayStr,
          limit: 100,
        });

        const map = {};
        if (listRes.success && listRes.records) {
          listRes.records.forEach((r) => {
            if (r.date) map[r.date] = r;
          });
        }

        // Map report rows as fallbacks
        res.rows.forEach((r) => {
          if (r.date && !map[r.date]) {
            map[r.date] = {
              _id: `rpt-${r.date}`,
              date: r.date,
              checkInTime: r.checkInTime !== "-" ? r.checkInTime : null,
              checkOutTime: r.checkOutTime !== "-" ? r.checkOutTime : null,
              totalWorkingMinutes: Math.round(
                parseFloat(r.workingHours || 0) * 60,
              ),
              totalBreakMinutes: Math.round(parseFloat(r.breakHours || 0) * 60),
              attendanceStatus: r.attendanceStatus || "Present",
              currentStatus: r.status || "Checked Out",
            };
          }
        });

        setMonthlyRecordsMap(map);
      }
    } catch (err) {
      console.error("Failed to load calendar month data", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "list") {
      fetchAttendanceList(false);
      const interval = setInterval(() => fetchAttendanceList(true), 5000);
      return () => clearInterval(interval);
    } else {
      fetchCalendarMonthData(false);
      const interval = setInterval(() => fetchCalendarMonthData(true), 10000);
      return () => clearInterval(interval);
    }
  }, [
    viewMode,
    search,
    departmentFilter,
    statusFilter,
    selectedDate,
    page,
    calendarDate,
  ]);

  const handleExportCSV = () => {
    if (!records.length) return;
    const headers = [
      "Employee ID",
      "Name",
      "Department",
      "Date",
      "Check-In",
      "Check-Out",
      "Status",
      "Work Hours",
      "Break Minutes",
      "Attendance Status",
    ];
    const csvRows = [headers.join(",")];

    records.forEach((r) => {
      const empName = `"${r.employee?.fullName || r.employee?.name || "Unknown"}"`;
      const empId = `"${r.employeeCustomId || r.employee?.employeeId || ""}"`;
      const dept = `"${r.employee?.department || "General"}"`;
      const checkIn = r.checkInTime
        ? new Date(r.checkInTime).toLocaleTimeString()
        : "-";
      const checkOut = r.checkOutTime
        ? new Date(r.checkOutTime).toLocaleTimeString()
        : "-";
      const workHrs = ((r.totalWorkingMinutes || 0) / 60).toFixed(1);
      const breakMins = r.totalBreakMinutes || 0;

      csvRows.push(
        [
          empId,
          empName,
          dept,
          r.date,
          checkIn,
          checkOut,
          r.currentStatus,
          workHrs,
          breakMins,
          r.attendanceStatus,
        ].join(","),
      );
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_${selectedDate}.csv`;
    a.click();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Working":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "On Break":
        return "bg-amber-50 text-amber-600 border-amber-200";
      case "Idle":
        return "bg-purple-50 text-purple-600 border-purple-200";
      case "Checked Out":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "Not Checked In":
      case "Offline":
      default:
        return "bg-rose-50 text-rose-600 border-rose-200";
    }
  };

  // ── Calendar Helpers ──────────────────────────────────────────────────────
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
  const todayStr = new Date().toISOString().split("T")[0];

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Title & View Mode Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-slate-900 font-extrabold text-base">
            {isEmployee
              ? "My Attendance Records"
              : "Company Attendance Records"}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isEmployee
              ? "View past attendance records in interactive calendar or table list format"
              : "View and manage all employee attendance logs"}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* View Switcher (Calendar vs Table) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-white text-[#5D5FEF] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Calendar View</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-[#5D5FEF] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List View</span>
            </button>
          </div>

          {viewMode === "list" && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* ── CALENDAR VIEW MODE ───────────────────────────────────────────────── */}
      {viewMode === "calendar" && (
        <div className="space-y-4">
          {/* Month Header & Controls */}
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <h4 className="text-base font-extrabold text-slate-900">
                {monthNames[month]} {year}
              </h4>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-[#5D5FEF] border border-indigo-100">
                Monthly Log
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                {monthNames[month]}
              </button>
              <button
                onClick={nextMonth}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid Header (Weekdays) */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-black uppercase text-slate-400 tracking-wider">
            {weekDays.map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid Days */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank leading cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div
                key={`blank-${idx}`}
                className="h-28 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/60 opacity-40"
              ></div>
            ))}

            {/* Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const isToday = dateStr === todayStr;
              const record = monthlyRecordsMap[dateStr];

              const dayOfWeekIndex = new Date(year, month, dayNum).getDay();
              const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;

              let statusColor = "bg-slate-50 border-slate-200 text-slate-500";
              let badgeText = isWeekend ? "Weekend" : "Not Logged";

              if (record) {
                if (record.attendanceStatus === "Late Check-In") {
                  statusColor = "bg-amber-50 border-amber-200 text-amber-700";
                  badgeText = "Late Check-In";
                } else if (record.attendanceStatus === "Absent") {
                  statusColor = "bg-rose-50 border-rose-200 text-rose-700";
                  badgeText = "Absent";
                } else if (
                  record.attendanceStatus === "Half Day" ||
                  record.attendanceStatus === "On Leave"
                ) {
                  statusColor = "bg-indigo-50 border-indigo-200 text-[#5D5FEF]";
                  badgeText = record.attendanceStatus;
                } else if (
                  record.checkInTime ||
                  record.currentStatus === "Working" ||
                  record.currentStatus === "Checked Out"
                ) {
                  statusColor =
                    "bg-emerald-50 border-emerald-200 text-emerald-700";
                  badgeText =
                    record.currentStatus === "Working" ? "Working" : "Present";
                }
              }

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    if (record) {
                      onViewDetails(record);
                    }
                  }}
                  className={`h-28 p-2.5 rounded-2xl border transition flex flex-col justify-between ${
                    record
                      ? "cursor-pointer hover:shadow-md hover:border-[#5D5FEF]"
                      : "cursor-default"
                  } ${
                    isToday
                      ? "ring-2 ring-[#5D5FEF] ring-offset-2 bg-white"
                      : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black ${isToday ? "text-[#5D5FEF]" : "text-slate-800"}`}
                    >
                      {dayNum}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${statusColor}`}
                    >
                      {badgeText}
                    </span>
                  </div>

                  {record && (
                    <div className="space-y-1 mt-1">
                      <div className="text-[10px] font-bold text-slate-700 font-mono flex items-center justify-between">
                        <span>In:</span>
                        <span>
                          {record.checkInTime
                            ? new Date(record.checkInTime).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : "-"}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 font-mono flex items-center justify-between">
                        <span>Out:</span>
                        <span>
                          {record.checkOutTime
                            ? new Date(record.checkOutTime).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : "-"}
                        </span>
                      </div>
                      <div className="text-[10px] font-black text-[#5D5FEF] font-mono text-right">
                        {((record.totalWorkingMinutes || 0) / 60).toFixed(1)}{" "}
                        hrs
                      </div>
                    </div>
                  )}

                  {!record && (
                    <div className="text-[10px] text-slate-400 font-medium italic mt-auto">
                      {isWeekend ? "Off Day" : "No Session"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center flex-wrap gap-4 pt-3 border-t border-slate-200 text-xs font-semibold text-slate-600">
            <span className="font-bold text-slate-800">Status Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span>Present / Working</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span>Late Check-In</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span>
              <span>Half Day / On Leave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
              <span>Absent</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TABLE / LIST VIEW MODE ───────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {/* Table Filters Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center flex-wrap gap-3 w-full md:w-auto">
              {!isEmployee && (
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Employee..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#5D5FEF] transition"
                  />
                </div>
              )}

              {!isEmployee && (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#5D5FEF]"
                >
                  <option value="All">All Departments</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="HR">HR</option>
                </select>
              )}

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#5D5FEF]"
              >
                <option value="All">All Statuses</option>
                <option value="Working">Working</option>
                <option value="On Break">On Break</option>
                <option value="Idle">Idle</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Not Checked In">Not Checked In</option>
              </select>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#5D5FEF]"
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 rounded-l-xl">Employee</th>
                  <th className="py-3.5 px-4">Check-In</th>
                  <th className="py-3.5 px-4">Check-Out</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Work Hours</th>
                  <th className="py-3.5 px-4">Break Time</th>
                  <th className="py-3.5 px-4">Attendance</th>
                  <th className="py-3.5 px-4 text-right rounded-r-xl">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-slate-400 font-medium"
                    >
                      Loading attendance records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-slate-400 font-medium"
                    >
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => {
                    const emp = rec.employee || {};
                    const displayName =
                      emp.fullName ||
                      emp.name ||
                      emp.companyEmail ||
                      emp.email ||
                      "Employee";
                    const workHrs = (
                      (rec.totalWorkingMinutes || 0) / 60
                    ).toFixed(1);
                    const breakMins = rec.totalBreakMinutes || 0;

                    const getAvatarStatusDot = (status) => {
                      switch (status) {
                        case "Working":
                        case "Active":
                          return "bg-emerald-500 ring-2 ring-white";
                        case "Idle":
                          return "bg-amber-400 ring-2 ring-white";
                        case "On Break":
                          return "bg-orange-500 ring-2 ring-white";
                        default:
                          return "bg-slate-300 ring-2 ring-white";
                      }
                    };

                    return (
                      <tr
                        key={rec._id}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="h-9 w-9 rounded-xl bg-indigo-50 text-[#5D5FEF] font-black flex items-center justify-center shrink-0 border border-indigo-100">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ${getAvatarStatusDot(rec.currentStatus)}`}
                                title={`Current Status: ${rec.currentStatus}`}
                              />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {displayName}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-400">
                                {rec.employeeCustomId ||
                                  emp.employeeId ||
                                  emp._id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-mono font-semibold">
                          {rec.checkInTime
                            ? new Date(rec.checkInTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-mono font-semibold">
                          {rec.checkOutTime
                            ? new Date(rec.checkOutTime).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )
                            : "-"}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(rec.currentStatus)}`}
                          >
                            {rec.currentStatus}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-[#5D5FEF] font-mono">
                          {workHrs} hrs
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 font-mono">
                          {breakMins} mins
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {rec.attendanceStatus}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onViewDetails(rec)}
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#5D5FEF] transition cursor-pointer"
                              title="View Details & Timeline"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {!isEmployee && (
                              <button
                                onClick={() => onEditAttendance(rec)}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-emerald-600 transition cursor-pointer"
                                title="Edit Attendance (Admin)"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 font-medium">
            <div>
              Showing page <strong>{pagination.page}</strong> of{" "}
              <strong>{pagination.pages || 1}</strong> ({pagination.total}{" "}
              records total)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.pages || 1, p + 1))
                }
                disabled={page >= (pagination.pages || 1)}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
