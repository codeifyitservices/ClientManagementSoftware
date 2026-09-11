import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  RefreshCw, 
  User, 
  Clock,
  Layers,
  FileText
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminAttendanceAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        setLogs(payload.data || payload.logs || (Array.isArray(payload) ? payload : []));
      }
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter((l) => {
    const performedBy = l.performedBy?.name?.toLowerCase() || "";
    const action = l.action?.toLowerCase() || "";
    const notes = l.notes?.toLowerCase() || "";
    const q = search.toLowerCase();
    return performedBy.includes(q) || action.includes(q) || notes.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Immutable Attendance Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete tamper-proof logging of administrative approvals, regularization overrides, and policy changes.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, admin name or remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Audit Actions</option>
          <option value="WFH_APPROVED">WFH Approved</option>
          <option value="REGULARIZATION_APPROVED">Regularization Approved</option>
          <option value="POLICY_UPDATED">Policy Updated</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Action Executed</th>
                <th className="px-4 py-3.5">Performed By</th>
                <th className="px-4 py-3.5">IP & System Details</th>
                <th className="px-4 py-3.5">Notes & Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400 text-xs">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateStr = log.createdAt || log.timestamp ? new Date(log.createdAt || log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "--";
                  const perfName = log.performedBy?.fullName || log.performedBy?.name || log.adminName || "System";
                  const perfEmail = log.performedBy?.companyEmail || log.performedBy?.email || "";

                  return (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap text-xs font-mono">
                        {dateStr}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-bold text-xs px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-semibold text-slate-800">{perfName}</span>
                        {perfEmail && <div className="text-[11px] text-slate-400">{perfEmail}</div>}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-mono text-slate-500">
                        {log.ipAddress || "Internal"}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600 max-w-md">
                        {log.notes || "--"}
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
