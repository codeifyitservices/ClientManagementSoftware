import React, { useState, useEffect } from "react";
import { 
  Home, 
  Check, 
  X, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  CheckSquare, 
  Square, 
  RefreshCw,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminWfhRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionModal, setActionModal] = useState(null); // { type: 'approve' | 'reject' | 'bulk_approve', req?: object }
  const [adminComments, setAdminComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getAdminWfhRequests({
        status: statusFilter !== "all" ? statusFilter : undefined
      });
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        setRequests(payload?.data || payload?.requests || (Array.isArray(payload) ? payload : []));
        setSelectedIds([]);
      }
    } catch (err) {
      console.error("Failed to fetch WFH requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(requests.map((r) => r._id));
    }
  };

  const handleReviewSingle = async () => {
    if (!actionModal?.req) return;
    try {
      setActionLoading(true);
      if (actionModal.type === "approve") {
        await attendanceService.approveWfhRequest(actionModal.req._id, { adminComments });
      } else {
        await attendanceService.rejectWfhRequest(actionModal.req._id, { adminComments });
      }
      setActionModal(null);
      setAdminComments("");
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update WFH request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (!selectedIds.length) return;
    try {
      setActionLoading(true);
      await attendanceService.bulkApproveWfhAdmin({
        requestIds: selectedIds,
        adminComments: adminComments || "Approved in bulk by Admin"
      });
      setActionModal(null);
      setAdminComments("");
      setSelectedIds([]);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Bulk approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Work From Home (WFH) Requests</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review, approve, or reject remote work requests from employees across all departments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && statusFilter === "Pending" && (
            <button
              onClick={() => setActionModal({ type: "bulk_approve" })}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              Approve Selected ({selectedIds.length})
            </button>
          )}

          <button
            onClick={fetchRequests}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {["Pending", "Approved", "Rejected", "all"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === st
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {st === "all" ? "All Requests" : st}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                {statusFilter === "Pending" && (
                  <th className="px-4 py-3.5 w-10">
                    <button onClick={toggleSelectAll} className="text-slate-500 hover:text-indigo-600">
                      {selectedIds.length === requests.length && requests.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Date Requested</th>
                <th className="px-4 py-3.5">Reason</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Requested On</th>
                <th className="px-4 py-3.5">Admin Comments</th>
                {statusFilter === "Pending" && <th className="px-4 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading WFH requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400 text-sm">
                    No {statusFilter === "all" ? "" : statusFilter.toLowerCase()} WFH requests found.
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const reqDate = r.date ? new Date(r.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "--";
                  const createdDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--";
                  const isSelected = selectedIds.includes(r._id);

                  return (
                    <tr key={r._id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-indigo-50/40" : ""}`}>
                      {statusFilter === "Pending" && (
                        <td className="px-4 py-3.5">
                          <button onClick={() => toggleSelect(r._id)} className="text-slate-400 hover:text-indigo-600">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{r.employee?.fullName || r.user?.name || r.user?.fullName || r.name || "Unknown"}</div>
                        <div className="text-xs text-slate-400">{r.employee?.department || r.user?.department || "General"} • {r.employee?.companyEmail || r.user?.email || ""}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                        {reqDate}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                        {r.reason || "No reason specified"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          r.status === "Rejected" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                          "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {createdDate}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {r.adminComments || "--"}
                      </td>
                      {statusFilter === "Pending" && (
                        <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => setActionModal({ type: "approve", req: r })}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => setActionModal({ type: "reject", req: r })}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {actionModal.type === "bulk_approve"
                ? `Bulk Approve (${selectedIds.length}) WFH Requests`
                : `${actionModal.type === "approve" ? "Approve" : "Reject"} WFH Request`}
            </h3>

            {actionModal.req && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div><strong>Employee:</strong> {actionModal.req.user?.name}</div>
                <div><strong>Date:</strong> {new Date(actionModal.req.date).toLocaleDateString()}</div>
                <div><strong>Reason:</strong> {actionModal.req.reason}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Admin Comments / Remarks
              </label>
              <textarea
                rows={3}
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                placeholder="Add optional notes for the employee..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={actionModal.type === "bulk_approve" ? handleBulkApprove : handleReviewSingle}
                disabled={actionLoading}
                className={`px-5 py-2 text-xs font-semibold rounded-xl text-white transition-colors ${
                  actionModal.type === "reject"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {actionLoading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
