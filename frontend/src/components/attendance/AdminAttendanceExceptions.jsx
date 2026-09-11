import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  Calendar, 
  ShieldAlert,
  Zap,
  Eye,
  Check
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminAttendanceExceptions({ onSelectRecord }) {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Open");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedException, setSelectedException] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getAdminExceptions({
        status: statusFilter !== "all" ? statusFilter : undefined,
        severity: severityFilter !== "all" ? severityFilter : undefined
      });
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        setExceptions(payload.data || payload.exceptions || (Array.isArray(payload) ? payload : []));
      }
    } catch (err) {
      console.error("Failed to load exceptions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [statusFilter, severityFilter]);

  const runDetectionScan = async () => {
    try {
      setScanning(true);
      const res = await attendanceService.runAdminExceptionDetection({
        date: new Date().toISOString().split("T")[0]
      });
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        const d = payload.data || payload;
        alert(`Scan finished. Found ${d.exceptionsFound || 0} exceptions (${d.createdCount || 0} new).`);
        fetchExceptions();
      }
    } catch (err) {
      alert(err.message || "Exception scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (status) => {
    if (!selectedException) return;
    try {
      setSubmitting(true);
      await attendanceService.updateAdminExceptionStatus(selectedException._id, {
        status,
        resolutionNotes
      });
      setSelectedException(null);
      setResolutionNotes("");
      fetchExceptions();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update exception");
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "High":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">High</span>;
      case "Medium":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">Medium</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h2 className="text-xl font-bold text-slate-800">Automated Attendance Exceptions</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Proactively identify missed clock-outs, excessive breaks, geofence breaches, and short work hours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runDetectionScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 shadow-sm transition-colors disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning System..." : "Run Anomaly Scan"}
          </button>
          <button
            onClick={fetchExceptions}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          {["Open", "Under Review", "Resolved", "Ignored", "all"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {st === "all" ? "All Statuses" : st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Severity:</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Severities</option>
            <option value="High">High Severity</option>
            <option value="Medium">Medium Severity</option>
            <option value="Low">Low Severity</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Exception Type</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && exceptions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading attendance exceptions...
                  </td>
                </tr>
              ) : exceptions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400 text-sm">
                    No {statusFilter === "all" ? "" : statusFilter.toLowerCase()} exceptions detected. Great compliance!
                  </td>
                </tr>
              ) : (
                exceptions.map((ex) => {
                  const dateStr = ex.date ? new Date(ex.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "--";

                  return (
                    <tr key={ex._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{ex.employee?.fullName || ex.user?.name || ex.user?.fullName || ex.name || "Unknown"}</div>
                        <div className="text-xs text-slate-400">{ex.employee?.department || ex.user?.department || "General"}</div>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap text-xs">
                        {dateStr}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-xs text-slate-800">
                          {ex.type.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {getSeverityBadge(ex.severity)}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600 max-w-sm">
                        {ex.description}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          ex.status === "Resolved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          ex.status === "Ignored" ? "bg-slate-100 text-slate-600 border border-slate-200" :
                          "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {ex.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedException(ex)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors"
                        >
                          Resolve / Action
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

      {/* Resolution Modal */}
      {selectedException && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Handle Attendance Exception</h3>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div><strong>Employee:</strong> {selectedException.user?.name}</div>
              <div><strong>Exception:</strong> {selectedException.type}</div>
              <div><strong>Severity:</strong> {selectedException.severity}</div>
              <div><strong>Details:</strong> {selectedException.description}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Resolution Notes / Action Taken
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Employee verified client emergency, adjusted in regularization..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedException(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve("Ignored")}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Ignore
              </button>
              <button
                onClick={() => handleResolve("Resolved")}
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                {submitting ? "Saving..." : "Mark Resolved"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
