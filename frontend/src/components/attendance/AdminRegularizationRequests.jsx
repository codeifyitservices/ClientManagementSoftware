import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Check, 
  X, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle,
  ArrowRight,
  Eye
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminRegularizationRequests({ onSelectRecord }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [reviewModal, setReviewModal] = useState(null); // { type: 'approve' | 'reject', req: object }
  const [adminComments, setAdminComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getAdminRegularizations({
        status: statusFilter !== "all" ? statusFilter : undefined
      });
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        setRequests(payload?.data || payload?.requests || (Array.isArray(payload) ? payload : []));
      }
    } catch (err) {
      console.error("Failed to load regularization requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleReview = async () => {
    if (!reviewModal?.req) return;
    try {
      setSubmitting(true);
      if (reviewModal.type === "approve") {
        await attendanceService.approveRegularizationAdmin(reviewModal.req._id, { adminComments });
      } else {
        await attendanceService.rejectRegularizationAdmin(reviewModal.req._id, { adminComments });
      }
      setReviewModal(null);
      setAdminComments("");
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to process request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Attendance Regularization & Missed Punches</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review punch correction requests, calculate modified work hours, and adjust attendance logs.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
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
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Original Timestamps</th>
                <th className="px-4 py-3.5">Requested Timestamps</th>
                <th className="px-4 py-3.5">Reason</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Admin Comments</th>
                {statusFilter === "Pending" && <th className="px-4 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading regularization requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400 text-sm">
                    No {statusFilter === "all" ? "" : statusFilter.toLowerCase()} regularization requests found.
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const dateStr = r.date ? new Date(r.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "--";
                  const origIn = r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Missing";
                  const origOut = r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Missing";
                  
                  const reqIn = r.requestedClockIn ? new Date(r.requestedClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--";
                  const reqOut = r.requestedClockOut ? new Date(r.requestedClockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--";

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{r.employee?.fullName || r.user?.name || r.user?.fullName || r.name || "Unknown"}</div>
                        <div className="text-xs text-slate-400">{r.employee?.department || r.user?.department || "General"} • {r.employee?.companyEmail || r.user?.email || ""}</div>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-mono text-slate-500">
                        <span>{origIn}</span> → <span>{origOut}</span>
                      </td>

                      <td className="px-4 py-3.5 text-xs font-mono">
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {reqIn} → {reqOut}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                        {r.regularizationReason || "Missed punch"}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.regularizationStatus === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          r.regularizationStatus === "Rejected" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                          "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {r.regularizationStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {r.adminComments || "--"}
                      </td>

                      {statusFilter === "Pending" && (
                        <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => setReviewModal({ type: "approve", req: r })}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => setReviewModal({ type: "reject", req: r })}
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

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              {reviewModal.type === "approve" ? "Approve Regularization Request" : "Reject Regularization Request"}
            </h3>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div><strong>Employee:</strong> {reviewModal.req.user?.name}</div>
              <div><strong>Date:</strong> {new Date(reviewModal.req.date).toLocaleDateString()}</div>
              <div>
                <strong>Requested Correction:</strong>{" "}
                {reviewModal.req.requestedClockIn ? new Date(reviewModal.req.requestedClockIn).toLocaleTimeString() : "--"} to{" "}
                {reviewModal.req.requestedClockOut ? new Date(reviewModal.req.requestedClockOut).toLocaleTimeString() : "--"}
              </div>
              <div><strong>Employee Note:</strong> {reviewModal.req.regularizationReason}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Admin Comments / Explanation
              </label>
              <textarea
                rows={3}
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                placeholder="Optional remarks..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReviewModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={submitting}
                className={`px-5 py-2 text-xs font-semibold rounded-xl text-white transition-colors ${
                  reviewModal.type === "reject"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {submitting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
