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
  BarChart3
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

  return (
    <div className="space-y-6">
      {/* Top Selector & Filter Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Employee Attendance Profile
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive individual attendance performance, punch history, and remote work metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Year Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Search & Employee Select */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingEmployees}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer w-full"
            >
              {filteredEmployees.map((e) => (
                <option key={e._id || e.id} value={e._id || e.id}>
                  {e.fullName || e.name} ({e.employeeId || e.department || "Staff"})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchProfile}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
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
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-800">
                Attendance Punch Logs ({records.length} records)
              </h3>
              <span className="text-xs text-slate-400 font-medium">Year {selectedYear}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Location Mode</th>
                    <th className="px-4 py-3.5">Clock In</th>
                    <th className="px-4 py-3.5">Clock Out</th>
                    <th className="px-4 py-3.5">Working Hours</th>
                    <th className="px-4 py-3.5">Breaks</th>
                    <th className="px-4 py-3.5">Punctuality</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-10 text-slate-400 text-xs font-medium">
                        No attendance records found for this employee in {selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => {
                      const dateStr = r.date ? new Date(r.date).toLocaleDateString([], { month: "short", day: "numeric", weekday: "short", year: "numeric" }) : "--";
                      const rawIn = r.checkInTime || r.clockInTime;
                      const rawOut = r.checkOutTime || r.clockOutTime;
                      const inTime = rawIn ? new Date(rawIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
                      const outTime = rawOut ? new Date(rawOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
                      const totalMins = r.totalWorkingMinutes || 0;
                      const totalH = (totalMins / 60).toFixed(2);

                      return (
                        <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-800 whitespace-nowrap text-xs">
                            {dateStr}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                              r.attendanceStatus === "Present" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              r.attendanceStatus === "Absent" ? "bg-rose-50 text-rose-700 border-rose-200" :
                              "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {r.attendanceStatus || r.status || "Present"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">
                            {r.locationMode || (r.isRemote ? "WFH" : "Office")}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono font-bold text-emerald-700">
                            {inTime}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono font-bold text-slate-700">
                            {outTime}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-xs text-slate-900">
                            {totalH} hrs
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600">
                            {r.totalBreakMinutes || 0} mins ({r.breaks?.length || 0})
                          </td>
                          <td className="px-4 py-3.5 text-xs font-semibold">
                            {r.isLate ? (
                              <span className="text-rose-600">Late (+{r.lateMinutes || 0}m)</span>
                            ) : (
                              <span className="text-emerald-600">On Time</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => onSelectRecord && onSelectRecord(r)}
                              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
