import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Building2, 
  Filter, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Home,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserX,
  RefreshCw
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminAttendanceCalendar({ onSelectRecord }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState("all");
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getAdminCalendar({
        year,
        month,
        department: department !== "all" ? department : undefined,
        employeeId: selectedEmployee !== "all" ? selectedEmployee : undefined,
      });
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        const dataObj = payload?.data || payload;
        setCalendarData(dataObj.days || dataObj.calendar || []);
        setDepartments(dataObj.departments || []);
        setEmployees(dataObj.employees || []);
      }
    } catch (err) {
      console.error("Failed to load calendar", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [year, month, department, selectedEmployee]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
    setSelectedDayData(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
    setSelectedDayData(null);
  };

  const setToday = () => {
    setCurrentDate(new Date());
    setSelectedDayData(null);
  };

  // Generate calendar grid
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month, 0).getDate();

  const daysArray = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null); // empty padding
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayRecord = calendarData.find((item) => item.date === dateStr) || {
      date: dateStr,
      present: 0,
      absent: 0,
      halfDay: 0,
      onLeave: 0,
      wfh: 0,
      late: 0,
      records: []
    };
    daysArray.push({ day: d, dateStr, ...dayRecord });
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Calculate monthly overall statistics
  const totalPresentLogs = calendarData.reduce((acc, curr) => acc + (curr.present || 0), 0);
  const totalWfhLogs = calendarData.reduce((acc, curr) => acc + (curr.wfh || 0), 0);
  const totalLeavesLogs = calendarData.reduce((acc, curr) => acc + (curr.onLeave || 0), 0);
  const totalLateLogs = calendarData.reduce((acc, curr) => acc + (curr.late || 0), 0);

  return (
    <div className="space-y-6">
      {/* Monthly Summary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Present</div>
            <div className="text-lg font-black text-slate-900">{totalPresentLogs}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total WFH</div>
            <div className="text-lg font-black text-slate-900">{totalWfhLogs}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Leaves / Off</div>
            <div className="text-lg font-black text-slate-900">{totalLeavesLogs}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Late Arrivals</div>
            <div className="text-lg font-black text-slate-900">{totalLateLogs}</div>
          </div>
        </div>
      </div>

      {/* Calendar Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-900">Organization Attendance Calendar</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Month-level visual heatmap of staffing, leaves, WFH, and attendance density.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Department Filter */}
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Employee Filter */}
          {employees.length > 0 && (
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[170px] truncate"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName || emp.name || "Staff"}
                </option>
              ))}
            </select>
          )}

          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={setToday}
              className="text-xs font-black text-slate-800 px-3 min-w-[120px] text-center hover:bg-white py-1 rounded-lg transition-colors cursor-pointer"
              title="Jump to Today"
            >
              {monthNames[month - 1]} {year}
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchCalendar}
            disabled={loading}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Matrix */}
        {loading && calendarData.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold">Loading attendance calendar...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {daysArray.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="min-h-[110px] bg-slate-50/40 rounded-xl border border-dashed border-slate-100" />;
              }

              const isSelected = selectedDayData?.dateStr === cell.dateStr;
              const isToday = new Date().toISOString().split("T")[0] === cell.dateStr;
              const hasActivity = cell.present > 0 || cell.absent > 0 || cell.halfDay > 0 || cell.wfh > 0 || cell.onLeave > 0;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDayData(cell)}
                  className={`min-h-[110px] p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left ${
                    isSelected 
                      ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-300 shadow-sm" 
                      : isToday 
                      ? "border-indigo-400 bg-indigo-50/15" 
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-extrabold ${isToday ? "px-1.5 py-0.5 rounded-md bg-indigo-600 text-white" : "text-slate-700"}`}>
                      {cell.day}
                    </span>
                    {cell.late > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                        {cell.late} late
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 my-1">
                    {cell.present > 0 && (
                      <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center justify-between border border-emerald-200/50">
                        <span>Present</span>
                        <span>{cell.present}</span>
                      </div>
                    )}
                    {cell.wfh > 0 && (
                      <div className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded flex items-center justify-between border border-blue-200/50">
                        <span>WFH</span>
                        <span>{cell.wfh}</span>
                      </div>
                    )}
                    {cell.halfDay > 0 && (
                      <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex items-center justify-between border border-amber-200/50">
                        <span>Half-Day</span>
                        <span>{cell.halfDay}</span>
                      </div>
                    )}
                    {cell.onLeave > 0 && (
                      <div className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded flex items-center justify-between border border-purple-200/50">
                        <span>Leave</span>
                        <span>{cell.onLeave}</span>
                      </div>
                    )}
                    {cell.absent > 0 && (
                      <div className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded flex items-center justify-between border border-rose-200/50">
                        <span>Absent</span>
                        <span>{cell.absent}</span>
                      </div>
                    )}
                    {!hasActivity && (
                      <div className="text-[10px] text-slate-300 font-semibold text-center py-2">
                        --
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Day Drilldown Modal / Drawer */}
      {selectedDayData && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">
                Attendance Breakdown for {new Date(selectedDayData.dateStr).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Present: <strong className="text-emerald-600">{selectedDayData.present}</strong> | WFH: <strong className="text-blue-600">{selectedDayData.wfh}</strong> | Half-Day: <strong className="text-amber-600">{selectedDayData.halfDay}</strong> | Leave: <strong className="text-purple-600">{selectedDayData.onLeave}</strong> | Absent: <strong className="text-rose-600">{selectedDayData.absent}</strong>
              </p>
            </div>
            <button
              onClick={() => setSelectedDayData(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Clock In / Out</th>
                  <th className="px-4 py-3">Net Working Hours</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedDayData.records || []).length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400 text-xs">
                      No attendance activity recorded for this day.
                    </td>
                  </tr>
                ) : (
                  selectedDayData.records.map((r) => {
                    const empName = r.employee?.fullName || r.employee?.name || r.name || "Staff";
                    const empEmail = r.employee?.companyEmail || r.employee?.email || "";
                    const empDept = r.employee?.department || "General";
                    const inTime = r.checkInTime || r.clockInTime;
                    const outTime = r.checkOutTime || r.clockOutTime;
                    const netHours = r.totalHours !== undefined ? r.totalHours : (r.totalWorkingMinutes ? r.totalWorkingMinutes / 60 : 0);
                    const statusText = r.status || r.attendanceStatus || (r.checkInTime ? "Present" : "Logged");

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{empName}</div>
                          {empEmail && <div className="text-[10px] text-slate-400 font-mono">{empEmail}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-semibold">{empDept}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            statusText === "Present" || statusText === "Working"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : statusText === "Half Day"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : statusText === "WFH"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-600">
                          {r.locationMode || (r.isRemote ? "WFH" : "Office")}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {inTime ? new Date(inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--"} → {outTime ? new Date(outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--"}
                        </td>
                        <td className="px-4 py-3 font-black text-indigo-600">
                          {Number(netHours).toFixed(2)} hrs
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onSelectRecord && onSelectRecord(r)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                          >
                            View Record
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
