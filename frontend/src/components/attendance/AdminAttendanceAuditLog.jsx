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
  FileText,
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  X
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminAttendanceAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getAdminAuditLogs({
        action: actionFilter !== "all" ? actionFilter : undefined
      });
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
    setSelectedIds([]);
  }, [actionFilter]);

  const filteredLogs = logs.filter((l) => {
    const performedBy = l.performedBy?.name?.toLowerCase() || l.performedBy?.fullName?.toLowerCase() || l.adminName?.toLowerCase() || "";
    const action = l.action?.toLowerCase() || "";
    const notes = l.notes?.toLowerCase() || "";
    const q = search.toLowerCase();
    return performedBy.includes(q) || action.includes(q) || notes.includes(q);
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLogs.map((l) => l._id));
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
      await attendanceService.bulkDeleteAdminAuditLogs(selectedIds);
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      fetchLogs();
    } catch (err) {
      console.error("Failed to delete audit logs", err);
      alert(err.response?.data?.message || "Failed to delete audit logs");
    } finally {
      setBulkDeleting(false);
    }
  };

  const isAllSelected = filteredLogs.length > 0 && selectedIds.length === filteredLogs.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < filteredLogs.length;

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

      {/* Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold text-indigo-900">
              {selectedIds.length} log {selectedIds.length === 1 ? "entry" : "entries"} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all shadow-red-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPartiallySelected;
                    }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
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
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400 text-xs">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSelected = selectedIds.includes(log._id);
                  const dateStr = log.createdAt || log.timestamp ? new Date(log.createdAt || log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "--";
                  const perfName = log.performedBy?.fullName || log.performedBy?.name || log.adminName || "System";
                  const perfEmail = log.performedBy?.companyEmail || log.performedBy?.email || "";

                  return (
                    <tr 
                      key={log._id} 
                      className={`hover:bg-slate-50 transition-colors ${isSelected ? "bg-indigo-50/40" : ""}`}
                    >
                      <td className="w-10 px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(log._id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

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

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Delete Audit Log Records?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
              Are you sure you want to delete <strong className="text-red-600">{selectedIds.length}</strong> selected audit log {selectedIds.length === 1 ? "entry" : "entries"}? These trail entries will be permanently removed from the system.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-200 transition-all disabled:opacity-50"
              >
                {bulkDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete {selectedIds.length} {selectedIds.length === 1 ? "Record" : "Records"}
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
