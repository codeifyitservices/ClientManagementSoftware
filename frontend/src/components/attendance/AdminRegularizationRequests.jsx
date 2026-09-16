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
  RotateCcw,
  User,
  Calendar,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock3,
  CheckSquare,
  Square,
  Trash2
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AdminRegularizationRequests({ onSelectRecord }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewModal, setReviewModal] = useState(null); // { type: 'approve' | 'reject', req: object }
  const [adminComments, setAdminComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [counts, setCounts] = useState({ Pending: 0, Approved: 0, Rejected: 0, all: 0 });

  // Selection & Bulk Delete State
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchCounts = async () => {
    try {
      const res = await attendanceService.getAdminRegularizations({ status: "all", limit: 1000 });
      const payload = res?.data || res;
      const allReqs = payload?.data || payload?.requests || (Array.isArray(payload) ? payload : []);
      const pCount = allReqs.filter((r) => (r.status || r.regularizationStatus) === "Pending").length;
      const aCount = allReqs.filter((r) => (r.status || r.regularizationStatus) === "Approved").length;
      const rCount = allReqs.filter((r) => (r.status || r.regularizationStatus) === "Rejected").length;
      setCounts({
        Pending: pCount,
        Approved: aCount,
        Rejected: rCount,
        all: allReqs.length,
      });
    } catch (err) {
      console.error("Failed to load regularization counts", err);
    }
  };

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
      fetchCounts();
    } catch (err) {
      console.error("Failed to load regularization requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchCounts();
    setSelectedIds([]);
  }, [statusFilter]);

  const handleReview = async () => {
    if (!reviewModal?.req) return;
    try {
      setSubmitting(true);
      const res =
        reviewModal.type === "approve"
          ? await attendanceService.approveRegularizationAdmin(reviewModal.req._id, {
              comment: adminComments,
              adminComments,
            })
          : await attendanceService.rejectRegularizationAdmin(reviewModal.req._id, {
              comment: adminComments,
              adminComments,
            });

      if (res?.success === false) {
        alert(res?.message || "Failed to process request");
        return;
      }

      setReviewModal(null);
      setAdminComments("");
      fetchRequests();
      fetchCounts();
    } catch (err) {
      alert(err.response?.data?.message || err?.message || "Failed to process request");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (r.employee?.fullName || r.user?.name || r.user?.fullName || r.name || "").toLowerCase();
    const email = (r.employee?.companyEmail || r.user?.email || "").toLowerCase();
    const dept = (r.employee?.department || r.user?.department || "").toLowerCase();
    const reason = (r.regularizationReason || r.reason || "").toLowerCase();
    return name.includes(q) || email.includes(q) || dept.includes(q) || reason.includes(q);
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRequests.length && filteredRequests.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map((r) => r._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await attendanceService.bulkDeleteAdminRegularizations(selectedIds);
      if (res?.success) {
        setSelectedIds([]);
        setShowDeleteModal(false);
        fetchRequests();
        fetchCounts();
      } else {
        alert(res?.message || "Failed to delete selected regularization requests");
      }
    } catch (err) {
      alert(err.response?.data?.message || err?.message || "Error deleting regularization requests");
    } finally {
      setBulkDeleting(false);
    }
  };

  const isAllSelected = filteredRequests.length > 0 && selectedIds.length === filteredRequests.length;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                Attendance Regularization & Punch Requests
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and resolve missed punches, check-out reversals, and manual attendance corrections.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            fetchRequests();
            fetchCounts();
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "Pending", label: "Pending", showCount: true, badgeColor: "bg-rose-500 text-white" },
            { id: "Approved", label: "Approved" },
            { id: "Rejected", label: "Rejected" },
            { id: "all", label: "All Requests" },
          ].map(({ id, label, showCount, badgeColor }) => {
            const count = counts.Pending || 0;
            const isActive = statusFilter === id;
            return (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <span>{label}</span>
                {showCount && count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 min-w-[18px] text-[10px] font-black rounded-full text-center leading-none ${
                      isActive ? "bg-white text-indigo-700" : badgeColor
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, dept, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200/80 rounded-xl placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* Selected Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50/90 border border-indigo-200 p-3 rounded-2xl flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-2 text-xs text-indigo-950 font-bold">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <span>{selectedIds.length} of {filteredRequests.length} requests selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-indigo-100/60 transition cursor-pointer"
            >
              Deselect All
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] uppercase tracking-wider font-bold text-slate-500 select-none">
                <th className="px-4 py-3.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                    title={isAllSelected ? "Deselect all" : "Select all visible"}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3.5 min-w-[200px]">Employee</th>
                <th className="px-4 py-3.5 min-w-[120px]">Date</th>
                <th className="px-4 py-3.5 min-w-[180px]">Original Punches</th>
                <th className="px-4 py-3.5 min-w-[190px]">Requested Adjustment</th>
                <th className="px-4 py-3.5 min-w-[220px]">Reason & Notes</th>
                <th className="px-4 py-3.5 min-w-[110px]">Status</th>
                <th className="px-4 py-3.5 min-w-[140px]">Admin Remarks</th>
                <th className="px-5 py-3.5 min-w-[160px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-14 text-slate-400">
                    <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2.5 text-indigo-500" />
                    <p className="text-xs font-medium">Loading regularization requests...</p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-14 text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-slate-700">No requests found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery
                        ? "No results matching your search criteria."
                        : `No ${statusFilter === "all" ? "" : statusFilter.toLowerCase()} regularization requests.`}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => {
                  const dateStr = r.date
                    ? new Date(r.date).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "--";

                  const origIn =
                    r.clockInTime || r.existingCheckIn
                      ? new Date(r.clockInTime || r.existingCheckIn).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Missing";

                  const origOut =
                    r.clockOutTime || r.existingCheckOut
                      ? new Date(r.clockOutTime || r.existingCheckOut).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Missing";

                  const reqIn =
                    r.requestedClockIn || r.requestedCheckIn
                      ? new Date(r.requestedClockIn || r.requestedCheckIn).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--";

                  const reqOut =
                    r.requestedClockOut || r.requestedCheckOut
                      ? new Date(r.requestedClockOut || r.requestedCheckOut).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--";

                  const isRevert =
                    r.requestType === "Revert Checkout" ||
                    (r.regularizationReason || r.reason || "").toLowerCase().includes("revert");

                  const empName =
                    r.employee?.fullName || r.user?.name || r.user?.fullName || r.name || "Employee";
                  const empEmail = r.employee?.companyEmail || r.user?.email || "";
                  const empDept = r.employee?.department || r.user?.department || "General";
                  const currentStatus = r.regularizationStatus || r.status || "Pending";
                  const isPending = currentStatus === "Pending";
                  const isSelected = selectedIds.includes(r._id);

                  return (
                    <tr
                      key={r._id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(r._id)}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* Employee Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 text-xs sm:text-sm">{empName}</span>
                            {isRevert && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300/80 px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap shadow-2xs">
                                <RotateCcw className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                Revert Checkout
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            <span className="text-slate-500 font-semibold">{empDept}</span>
                            {empEmail && <span> • {empEmail}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap text-xs">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      {/* Original Timestamps */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-xs font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 text-slate-600">
                          <span className={origIn === "Missing" ? "text-slate-400 italic" : "text-slate-700 font-semibold"}>
                            {origIn}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className={isRevert ? "text-rose-600 font-bold" : origOut === "Missing" ? "text-slate-400 italic" : "text-slate-700 font-semibold"}>
                            {origOut}
                          </span>
                        </div>
                      </td>

                      {/* Requested Adjustment */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isRevert ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50/90 px-2.5 py-1 rounded-lg border border-amber-200 whitespace-nowrap shadow-2xs">
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Reopen Active Session</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-800 bg-emerald-50/90 px-2.5 py-1 rounded-lg border border-emerald-200 whitespace-nowrap">
                            <span>{reqIn}</span>
                            <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{reqOut}</span>
                          </span>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 max-w-[240px]">
                        <div className="truncate font-medium" title={r.regularizationReason || r.reason || "Punch adjustment"}>
                          {r.regularizationReason || r.reason || "Punch adjustment"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            currentStatus === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : currentStatus === "Rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              currentStatus === "Approved"
                                ? "bg-emerald-500"
                                : currentStatus === "Rejected"
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            }`}
                          />
                          {currentStatus}
                        </span>
                      </td>

                      {/* Admin Comments */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[160px]">
                        <div className="truncate" title={r.adminComments || r.adminComment || "--"}>
                          {r.adminComments || r.adminComment || "--"}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="inline-flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setReviewModal({ type: "approve", req: r })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                              title="Approve Request"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => setReviewModal({ type: "reject", req: r })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              title="Reject Request"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review / Decision Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl border flex items-center justify-center ${
                    reviewModal.type === "approve"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : "bg-rose-50 text-rose-600 border-rose-200"
                  }`}
                >
                  {reviewModal.type === "approve" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {reviewModal.type === "approve"
                      ? reviewModal.req.requestType === "Revert Checkout"
                        ? "Approve Checkout Revert Request"
                        : "Approve Regularization Request"
                      : reviewModal.req.requestType === "Revert Checkout"
                      ? "Reject Checkout Revert Request"
                      : "Reject Regularization Request"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {reviewModal.type === "approve"
                      ? "Confirm approval to update attendance records"
                      : "Provide optional feedback for rejecting this request"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary Card */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-700 space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Employee</span>
                <span className="font-bold text-slate-900">
                  {reviewModal.req.employee?.fullName ||
                    reviewModal.req.user?.name ||
                    reviewModal.req.user?.fullName ||
                    "Employee"}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Date</span>
                <span className="font-semibold text-slate-800">
                  {reviewModal.req.date ? new Date(reviewModal.req.date).toLocaleDateString([], { dateStyle: "long" }) : "--"}
                </span>
              </div>

              {reviewModal.req.requestType === "Revert Checkout" ||
              (reviewModal.req.regularizationReason || "").toLowerCase().includes("revert") ? (
                <div className="bg-amber-50/90 p-3 rounded-xl border border-amber-200 text-amber-900 text-xs font-medium space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Action Summary: Revert Check-Out</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    Reverts accidental checkout at{" "}
                    <strong>
                      {reviewModal.req.clockOutTime || reviewModal.req.existingCheckOut
                        ? new Date(
                            reviewModal.req.clockOutTime || reviewModal.req.existingCheckOut
                          ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "recorded time"}
                    </strong>{" "}
                    and restores the employee's active shift session status to <strong>Working</strong>.
                  </p>
                </div>
              ) : (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Requested Timestamps</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {reviewModal.req.requestedClockIn || reviewModal.req.requestedCheckIn
                      ? new Date(
                          reviewModal.req.requestedClockIn || reviewModal.req.requestedCheckIn
                        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "--"}{" "}
                    →{" "}
                    {reviewModal.req.requestedClockOut || reviewModal.req.requestedCheckOut
                      ? new Date(
                          reviewModal.req.requestedClockOut || reviewModal.req.requestedCheckOut
                        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "--"}
                  </span>
                </div>
              )}

              <div className="pt-1">
                <span className="text-slate-500 font-medium block mb-1">Employee's Note:</span>
                <p className="bg-white p-2.5 rounded-xl border border-slate-200/70 text-slate-800 font-medium italic">
                  "{reviewModal.req.regularizationReason || reviewModal.req.reason || "Missed punch correction"}"
                </p>
              </div>
            </div>

            {/* Admin Comments Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Comments / Remarks
              </label>
              <textarea
                rows={3}
                value={adminComments}
                onChange={(e) => setAdminComments(e.target.value)}
                placeholder="Add internal remarks or explanation for employee (optional)..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReviewModal(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={submitting}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white transition shadow-sm cursor-pointer disabled:opacity-50 ${
                  reviewModal.type === "reject"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                }`}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : reviewModal.type === "approve" ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm Approval</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {selectedIds.length} Regularization Request{selectedIds.length > 1 ? "s" : ""}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>
                You are about to permanently delete <strong>{selectedIds.length}</strong> selected regularization request{selectedIds.length > 1 ? "s" : ""}.
              </p>
              <p className="text-slate-500">
                The requests will be removed from attendance records and regularization status will be cleared.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {bulkDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
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
