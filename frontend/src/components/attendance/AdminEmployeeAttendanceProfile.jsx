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
  RefreshCw
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminEmployeeAttendanceProfile({ onSelectRecord }) {
  const [employees, setEmployees] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/employees", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data?.success && data.data?.length > 0) {
        setEmployees(data.data);
        if (!selectedUserId) {
          setSelectedUserId(data.data[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load employees", err);
    }
  };

  const fetchProfile = async () => {
    if (!selectedUserId) return;
    try {
      setLoading(true);
      const [year, month] = currentMonth.split("-");
      const res = await attendanceService.getAdminEmployeeProfile(selectedUserId, {
        year: parseInt(year),
        month: parseInt(month)
      });
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        setProfileData(payload.data || payload);
      }
    } catch (err) {
      console.error("Failed to load employee profile", err);
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
  }, [selectedUserId, currentMonth]);

  const filteredEmployees = employees.filter((e) =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Employee Picker */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Employee Attendance Profile</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deep dive into individual employee attendance history, punctuality rates, and daily records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500"
          />

          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 max-w-xs"
          >
            {filteredEmployees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name} ({emp.department || "General"})
              </option>
            ))}
          </select>

          <button
            onClick={fetchProfile}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Days Present</span>
              <div className="text-xl font-bold text-emerald-600 mt-1">{profileData.stats?.presentDays || 0}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Half-Days</span>
              <div className="text-xl font-bold text-amber-600 mt-1">{profileData.stats?.halfDays || 0}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">WFH Days</span>
              <div className="text-xl font-bold text-blue-600 mt-1">{profileData.stats?.wfhDays || 0}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Work Hrs</span>
              <div className="text-xl font-bold text-slate-800 mt-1">{(profileData.stats?.totalWorkHours || 0).toFixed(1)}h</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Punctuality Rate</span>
              <div className="text-xl font-bold text-indigo-600 mt-1">{profileData.stats?.punctualityRate || 100}%</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Overtime Logged</span>
              <div className="text-xl font-bold text-purple-600 mt-1">{profileData.stats?.overtimeMinutes || 0}m</div>
            </div>
          </div>

          {/* Records Table for this Employee */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-800">
                Monthly Logs for {profileData.user?.name || profileData.employee?.fullName || profileData.user?.fullName || "Employee"}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {profileData.records?.length || 0} active entries
              </span>
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
                    <th className="px-4 py-3.5">Total Hours</th>
                    <th className="px-4 py-3.5">Breaks</th>
                    <th className="px-4 py-3.5">Punctuality / Notes</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(profileData.records || []).length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-400 text-xs">
                        No attendance logs recorded for this employee in the selected month.
                      </td>
                    </tr>
                  ) : (
                    profileData.records.map((r) => {
                      const dateStr = r.date ? new Date(r.date).toLocaleDateString([], { month: "short", day: "numeric", weekday: "short" }) : "--";
                      const rawIn = r.checkInTime || r.clockInTime;
                      const rawOut = r.checkOutTime || r.clockOutTime;
                      const inTime = rawIn ? new Date(rawIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                      const outTime = rawOut ? new Date(rawOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                      const totalH = r.totalHours !== undefined ? r.totalHours : (r.totalWorkingMinutes ? r.totalWorkingMinutes / 60 : 0);

                      return (
                        <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-slate-800 whitespace-nowrap text-xs">
                            {dateStr}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {r.status || r.attendanceStatus || "Present"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
                            {r.locationMode || (r.isRemote ? "WFH" : "Office")}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono text-emerald-700 font-medium">
                            {inTime}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono text-slate-700 font-medium">
                            {outTime}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-xs text-slate-800">
                            {Number(totalH).toFixed(2)} hrs
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600">
                            {r.totalBreakMinutes || 0} mins ({r.breaks?.length || 0})
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            {r.isLate ? (
                              <span className="text-rose-600 font-semibold">Late +{r.lateMinutes}m</span>
                            ) : (
                              <span className="text-emerald-600">On Time</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => onSelectRecord && onSelectRecord(r)}
                              className="text-xs text-indigo-600 font-semibold hover:underline"
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
