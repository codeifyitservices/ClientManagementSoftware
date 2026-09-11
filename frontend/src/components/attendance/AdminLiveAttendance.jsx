import React, { useState, useEffect } from "react";
import { 
  Users, 
  Coffee, 
  Clock, 
  MapPin, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Home, 
  Briefcase,
  Eye,
  Filter
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminLiveAttendance({ onSelectRecord }) {
  const [liveData, setLiveData] = useState({
    summary: { totalActive: 0, checkedIn: 0, onBreak: 0, checkedOut: 0, wfh: 0, onDuty: 0, lateArrivals: 0 },
    departments: [],
    locations: [],
    records: []
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchLive = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getAdminLiveAttendance({
        department: deptFilter !== "all" ? deptFilter : undefined,
        location: locationFilter !== "all" ? locationFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined
      });
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        const dataObj = payload?.data || payload;
        setLiveData({
          summary: dataObj?.summary || { totalActive: 0, checkedIn: 0, onBreak: 0, checkedOut: 0, wfh: 0, lateArrivals: 0 },
          departments: dataObj?.departments || [],
          locations: dataObj?.locations || [],
          records: dataObj?.records || []
        });
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("Failed to load live attendance", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
  }, [deptFilter, locationFilter, statusFilter]);

  // Polling interval for live status
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLive();
    }, 30000); // every 30s
    return () => clearInterval(interval);
  }, [autoRefresh, deptFilter, locationFilter, statusFilter]);

  const filteredRecords = (liveData.records || []).filter((r) => {
    const name = r.user?.name?.toLowerCase() || "";
    const email = r.user?.email?.toLowerCase() || "";
    const query = search.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const getStatusBadge = (r) => {
    if (r.activeBreak) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          On Break
        </span>
      );
    }
    if (r.status === "Inactive" || r.status === "Idle") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          Inactive (15m+ Idle)
        </span>
      );
    }
    if (r.status === "Present" && !r.clockOutTime) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          Working Live
        </span>
      );
    }
    if (r.status === "Completed" || r.clockOutTime) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          Checked Out
        </span>
      );
    }
    if (r.status === "Half-Day") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          Half Day
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
        {r.status || "Unknown"}
      </span>
    );
  };

  const getLocationIcon = (mode) => {
    switch (mode) {
      case "WFH":
        return <Home className="w-3.5 h-3.5 text-indigo-500" />;
      case "On-Duty":
      case "Client Site":
        return <Briefcase className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Building2 className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const formatLateDuration = (mins) => {
    if (!mins || mins <= 0) return "Late";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Live Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-slate-800">Live Attendance Monitor</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of staff clock-in, active breaks, locations, and working hours • Last updated {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh 
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" 
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {autoRefresh ? "Auto Refresh: ON (30s)" : "Auto Refresh: PAUSED"}
          </button>
          <button
            onClick={fetchLive}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Logged In</div>
            <div className="text-lg font-bold text-slate-800">{liveData.summary?.totalActive || 0}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Working</div>
            <div className="text-lg font-bold text-emerald-600">{liveData.summary?.checkedIn || 0}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">On Break</div>
            <div className="text-lg font-bold text-amber-600">{liveData.summary?.onBreak || 0}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Checked Out</div>
            <div className="text-lg font-bold text-slate-700">{liveData.summary?.checkedOut || 0}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">WFH</div>
            <div className="text-lg font-bold text-blue-600">{liveData.summary?.wfh || 0}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Late Marks</div>
            <div className="text-lg font-bold text-rose-600">{liveData.summary?.lateArrivals || 0}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Live Statuses</option>
            <option value="working">Currently Working</option>
            <option value="inactive">Inactive (15m+ Idle)</option>
            <option value="break">On Break</option>
            <option value="checked_out">Checked Out</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Departments</option>
            {(liveData.departments || []).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Work Locations</option>
            <option value="Office">Office</option>
            <option value="WFH">WFH</option>
          </select>
        </div>
      </div>

      {/* Live Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="px-5 py-3.5 min-w-[220px]">Employee</th>
                <th className="px-4 py-3.5 min-w-[130px]">Status</th>
                <th className="px-4 py-3.5 min-w-[170px]">Mode / Shift</th>
                <th className="px-4 py-3.5 min-w-[110px]">Clock In</th>
                <th className="px-4 py-3.5 min-w-[100px]">Clock Out</th>
                <th className="px-4 py-3.5 min-w-[120px]">Breaks / Active</th>
                <th className="px-4 py-3.5 min-w-[130px]">Net Active Hrs</th>
                <th className="px-4 py-3.5 min-w-[120px]">Flags</th>
                <th className="px-4 py-3.5 min-w-[90px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading live attendance records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    No active attendance records found for today matching the filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const clockIn = r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                  const clockOut = r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
                  const netHours = (r.totalHours || 0).toFixed(2);
                  const totalBreakMins = r.totalBreakMinutes || 0;

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-sm">
                            {r.user?.name?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{r.user?.name || "Unknown"}</div>
                            <div className="text-xs text-slate-400 truncate">{r.user?.department || "General"} • {r.user?.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(r)}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {getLocationIcon(r.locationMode)}
                          <span>{r.locationMode || "Office"}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1 truncate max-w-[160px]" title={r.shift || "General (09:30 AM - 06:30 PM)"}>
                          {r.shift || "General (09:30 AM - 06:30 PM)"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{clockIn}</span>
                        {r.clockInLocation && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[110px]" title={r.clockInLocation}>{r.clockInLocation}</div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-medium text-slate-600">{clockOut}</span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs">
                          {r.activeBreak ? (
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                              Active ({r.activeBreak.type || "Break"})
                            </span>
                          ) : (
                            <span className="text-slate-700 font-medium">{totalBreakMins} mins</span>
                          )}
                          <div className="text-[11px] text-slate-400">{r.breaks?.length || 0} breaks taken</div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-800">{netHours}h</span>
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              r.totalHours >= 8 ? "bg-emerald-500" : r.totalHours >= 4 ? "bg-blue-500" : "bg-amber-400"
                            }`}
                            style={{ width: `${Math.min(100, ((r.totalHours || 0) / 9) * 100)}%` }}
                          ></div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {r.isLate && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                              Late ({formatLateDuration(r.lateMinutes)})
                            </span>
                          )}
                          {r.isEarlyCheckout && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Early ({r.earlyCheckoutMinutes || 0}m)
                            </span>
                          )}
                          {r.overtimeMinutes > 0 && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              OT ({r.overtimeMinutes}m)
                            </span>
                          )}
                          {r.regularizationStatus === "Pending" && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              Reg Pending
                            </span>
                          )}
                          {!r.isLate && !r.isEarlyCheckout && !r.overtimeMinutes && (
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              On Time
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSelectRecord && onSelectRecord(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
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
  );
}
