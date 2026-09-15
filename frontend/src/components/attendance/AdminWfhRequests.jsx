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
  AlertCircle,
  Wifi,
  MapPin,
  ShieldCheck
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
    if (!actionModal?.req?._id) return;
    try {
      setActionLoading(true);
      if (actionModal.type === "approve") {
        await attendanceService.approveWfhRequest(actionModal.req._id, {
          adminComments
        });
      } else {
        await attendanceService.rejectWfhRequest(actionModal.req._id, {
          rejectionReason: adminComments || "Rejected by administrator"
        });
      }
      setActionModal(null);
      setAdminComments("");
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${actionModal.type} request`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      await attendanceService.bulkApproveWfhAdmin({
        requestIds: selectedIds,
        adminComments
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

  const formatDateDisplay = (req) => {
    if (!req) return "--";
    const start = req.startDate || req.date;
    const end = req.endDate;
    if (!start) return "--";
    try {
      const startStr = new Date(start).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
      if (end && new Date(end).toDateString() !== new Date(start).toDateString()) {
        const endStr = new Date(end).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
        return `${startStr} - ${endStr}`;
      }
      return startStr;
    } catch {
      return String(start);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Home className="w-5 h-5 text-indigo-600" />
            Work From Home (WFH) Requests
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review, approve, or reject employee requests for remote attendance and 24-hour network IP whitelisting.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {statusFilter === "Pending" && selectedIds.length > 0 && (
            <button
              onClick={() => setActionModal({ type: "bulk_approve" })}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Approve Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={fetchRequests}
            className="flex items-center gap-1 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {["Pending", "Approved", "Rejected", "all"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              statusFilter === status
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {status === "all" ? "All Requests" : status}
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
                    <button onClick={toggleSelectAll} className="text-slate-500 hover:text-indigo-600 cursor-pointer">
                      {selectedIds.length === requests.length && requests.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Date & Duration</th>
                <th className="px-4 py-3.5">IP & Geolocation</th>
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
                  <td colSpan="9" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading WFH requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400 text-sm">
                    No {statusFilter === "all" ? "" : statusFilter.toLowerCase()} WFH requests found.
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const reqDateStr = formatDateDisplay(r);
                  const createdDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--";
                  const isSelected = selectedIds.includes(r._id);
                  const employeeName = r.employee?.fullName || r.user?.name || r.user?.fullName || r.name || "Unknown";
                  const employeeDept = r.employee?.department || r.user?.department || "General";
                  const employeeEmail = r.employee?.companyEmail || r.employee?.email || r.user?.email || "";
                  const ipAddress = r.requestIp || r.ip || "--";
                  const locationDesc = r.requestLocation || (r.requestLatitude ? `GPS: ${r.requestLatitude.toFixed(4)}, ${r.requestLongitude.toFixed(4)}` : "Remote Network");

                  return (
                    <tr key={r._id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-indigo-50/40" : ""}`}>
                      {statusFilter === "Pending" && (
                        <td className="px-4 py-3.5">
                          <button onClick={() => toggleSelect(r._id)} className="text-slate-400 hover:text-indigo-600 cursor-pointer">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{employeeName}</div>
                        <div className="text-xs text-slate-400">{employeeDept} • {employeeEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                        <div>{reqDateStr}</div>
                        {r.duration && <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{r.duration}</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-xs text-slate-800">{ipAddress}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]" title={locationDesc}>
                          {locationDesc}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate" title={r.reason}>
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
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => setActionModal({ type: "reject", req: r })}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
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
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800">
              {actionModal.type === "bulk_approve"
                ? `Bulk Approve (${selectedIds.length}) WFH Requests`
                : `${actionModal.type === "approve" ? "Approve" : "Reject"} WFH Request`}
            </h3>

            {actionModal.req && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2.5">
                <div className="flex justify-between items-start pb-1.5 border-b border-slate-200/60">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Employee</span>
                  <span className="font-bold text-slate-800 text-right">
                    {actionModal.req.employee?.fullName || actionModal.req.user?.name || actionModal.req.user?.fullName || actionModal.req.name || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between items-start pb-1.5 border-b border-slate-200/60">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Date & Duration</span>
                  <span className="font-semibold text-slate-700 text-right">
                    {formatDateDisplay(actionModal.req)} {actionModal.req.duration ? `(${actionModal.req.duration})` : ""}
                  </span>
                </div>
                <div className="flex justify-between items-start pb-1.5 border-b border-slate-200/60">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Public IP</span>
                  <span className="font-mono font-bold text-indigo-600 text-right">
                    {actionModal.req.requestIp || actionModal.req.ip || "Unknown IP"}
                  </span>
                </div>
                <div className="flex justify-between items-start pb-1.5 border-b border-slate-200/60">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Geolocation</span>
                  <span className="font-medium text-slate-700 text-right max-w-[220px] truncate" title={actionModal.req.requestLocation || "Remote Network"}>
                    {actionModal.req.requestLocation || (actionModal.req.requestLatitude ? `GPS: ${actionModal.req.requestLatitude.toFixed(4)}, ${actionModal.req.requestLongitude.toFixed(4)}` : "Remote Network")}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Reason</span>
                  <span className="font-medium text-slate-700 text-right max-w-[220px]">
                    {actionModal.req.reason || "None specified"}
                  </span>
                </div>
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
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={actionModal.type === "bulk_approve" ? handleBulkApprove : handleReviewSingle}
                disabled={actionLoading}
                className={`px-5 py-2 text-xs font-semibold rounded-xl text-white transition-colors cursor-pointer disabled:opacity-50 ${
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
