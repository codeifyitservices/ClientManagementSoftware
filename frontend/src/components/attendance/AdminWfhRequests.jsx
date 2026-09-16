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
  ShieldCheck,
  ShieldAlert,
  Clock,
  Trash2,
  Copy,
  CheckCircle2,
  Globe
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Active Whitelisted IPs Modal State
  const [showActiveWhitelistsModal, setShowActiveWhitelistsModal] = useState(false);
  const [whitelistsList, setWhitelistsList] = useState([]);
  const [whitelistsLoading, setWhitelistsLoading] = useState(false);
  const [whitelistSearch, setWhitelistSearch] = useState("");
  const [revokingId, setRevokingId] = useState(null);
  const [revokeSuccessMsg, setRevokeSuccessMsg] = useState("");
  const [copiedIp, setCopiedIp] = useState(null);

  const fetchWhitelists = async () => {
    try {
      setWhitelistsLoading(true);
      const res = await attendanceService.getWhitelists();
      if (res?.success) {
        setWhitelistsList(res.whitelists || []);
      }
    } catch (err) {
      console.error("Failed to fetch whitelists", err);
    } finally {
      setWhitelistsLoading(false);
    }
  };

  useEffect(() => {
    fetchWhitelists();
  }, []);

  const handleCopyIp = (ip) => {
    if (!ip) return;
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleRevokeWhitelist = async (id, empName) => {
    if (
      !window.confirm(
        `Are you sure you want to revoke remote access and delete the whitelisted IP/Geolocation for ${
          empName || "this employee"
        }? This will immediately terminate their remote check-in authorization.`
      )
    ) {
      return;
    }

    try {
      setRevokingId(id);
      const res = await attendanceService.deleteWhitelist(id);
      if (res?.success) {
        setRevokeSuccessMsg("Remote authorization revoked successfully.");
        setTimeout(() => setRevokeSuccessMsg(""), 3500);
        await fetchWhitelists();
        await fetchRequests();
      } else {
        alert(res?.message || "Failed to revoke whitelist");
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to revoke whitelist");
    } finally {
      setRevokingId(null);
    }
  };

  const getExpiryDisplay = (wl) => {
    if (!wl?.expiresAt) {
      return {
        text: "Permanent Access (No Expiry)",
        timeLeft: "Permanent",
        isExpired: false,
        badge: "Permanent",
        tone: "bg-slate-100 text-slate-700 border-slate-200",
      };
    }
    const exp = new Date(wl.expiresAt);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    if (diffMs <= 0) {
      return {
        text: `Expired on ${exp.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`,
        timeLeft: "Expired",
        isExpired: true,
        badge: "Expired",
        tone: "bg-rose-50 text-rose-700 border-rose-200",
      };
    }
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeLeft =
      diffHours >= 24
        ? `${Math.floor(diffHours / 24)}d ${diffHours % 24}h remaining`
        : `${diffHours}h ${diffMins}m remaining`;

    return {
      text: `Valid until: ${exp.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`,
      timeLeft,
      isExpired: false,
      badge: timeLeft,
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  };

  const formatDateDisplay = (req) => {
    if (!req) return "--";
    if (req.startDate && req.endDate) {
      const s = new Date(req.startDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
      const e = new Date(req.endDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
      return s === e ? s : `${s} → ${e}`;
    }
    if (req.startDate) {
      return new Date(req.startDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    }
    if (req.date) {
      return new Date(req.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    }
    if (req.createdAt) {
      return new Date(req.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    }
    return "--";
  };

  const activeWhitelistsCount = whitelistsList.filter((w) => {
    if (w.status !== "Active") return false;
    if (!w.expiresAt) return true;
    return new Date(w.expiresAt) > new Date();
  }).length;

  const filteredWhitelists = whitelistsList.filter((w) => {
    if (!whitelistSearch.trim()) return true;
    const term = whitelistSearch.toLowerCase();
    const empName = w.employee?.fullName?.toLowerCase() || "";
    const empId = w.employee?.employeeId?.toLowerCase() || "";
    const ip = w.ipAddress?.toLowerCase() || "";
    const loc = w.locationName?.toLowerCase() || "";
    return empName.includes(term) || empId.includes(term) || ip.includes(term) || loc.includes(term);
  });

  const [wfhCounts, setWfhCounts] = useState({ Pending: 0, Approved: 0, Rejected: 0, all: 0 });

  const fetchWfhCounts = async () => {
    try {
      const res = await attendanceService.getAdminWfhRequests({ status: "all" });
      const payload = res?.data || res;
      const allReqs = payload?.data || payload?.requests || (Array.isArray(payload) ? payload : []);
      const pCount = allReqs.filter((r) => r.status === "Pending").length;
      const aCount = allReqs.filter((r) => r.status === "Approved").length;
      const rCount = allReqs.filter((r) => r.status === "Rejected").length;
      setWfhCounts({
        Pending: pCount,
        Approved: aCount,
        Rejected: rCount,
        all: allReqs.length,
      });
    } catch (err) {
      console.error("Failed to load WFH counts", err);
    }
  };

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
      fetchWfhCounts();
    } catch (err) {
      console.error("Failed to fetch WFH requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchWfhCounts();
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
      let res;
      if (actionModal.type === "approve") {
        res = await attendanceService.approveWfhRequest(actionModal.req._id, {
          adminComments
        });
      } else {
        res = await attendanceService.rejectWfhRequest(actionModal.req._id, {
          rejectionReason: adminComments || "Rejected by administrator"
        });
      }
      if (res && !res.success) {
        alert(res.message || `Failed to ${actionModal.type} request`);
        return;
      }
      setActionModal(null);
      setAdminComments("");
      fetchRequests();
      fetchWhitelists();
    } catch (err) {
      alert(err.response?.data?.message || err.message || `Failed to ${actionModal.type} request`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      const res = await attendanceService.bulkApproveWfhAdmin({
        requestIds: selectedIds,
        adminComments
      });
      if (res && !res.success) {
        alert(res.message || "Bulk approval failed");
        return;
      }
      setActionModal(null);
      setAdminComments("");
      setSelectedIds([]);
      fetchRequests();
      fetchWhitelists();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Bulk approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkDeleting(true);
      const res = await attendanceService.bulkDeleteAdminWfhRequests(selectedIds);
      if (res?.success) {
        setSelectedIds([]);
        setShowDeleteModal(false);
        fetchRequests();
        fetchWfhCounts();
      } else {
        alert(res?.message || "Failed to delete selected WFH requests");
      }
    } catch (err) {
      alert(err.response?.data?.message || err?.message || "Error deleting WFH requests");
    } finally {
      setBulkDeleting(false);
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
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {statusFilter === "Pending" && selectedIds.length > 0 && (
            <button
              onClick={() => setActionModal({ type: "bulk_approve" })}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Approve Selected ({selectedIds.length})
            </button>
          )}
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer animate-fade-in"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={() => {
              fetchRequests();
              fetchWhitelists();
            }}
            className="flex items-center gap-1 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs & Whitelisted IP Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "Pending", label: "Pending", showCount: true, badgeColor: "bg-amber-500 text-white" },
            { id: "Approved", label: "Approved" },
            { id: "Rejected", label: "Rejected" },
            { id: "all", label: "All Requests" },
          ].map(({ id, label, showCount, badgeColor }) => {
            const count = wfhCounts.Pending || 0;
            return (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  statusFilter === id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 border border-slate-200 bg-white"
                }`}
              >
                <span>{label}</span>
                {showCount && count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 min-w-[18px] text-[10px] font-black rounded-full text-center leading-tight shadow-xs ${
                      statusFilter === id ? "bg-white text-indigo-700" : badgeColor
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Action Button (in the red highlighted area) */}
        <button
          type="button"
          onClick={() => {
            fetchWhitelists();
            setShowActiveWhitelistsModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-[#5D5FEF] border border-indigo-200 transition shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <ShieldCheck className="w-4 h-4 text-[#5D5FEF]" />
          <span>Whitelisted IP & Geolocation</span>
          {activeWhitelistsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#5D5FEF] text-white">
              {activeWhitelistsCount}
            </span>
          )}
        </button>
      </div>

      {/* Floating Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50/90 border border-indigo-200 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-indigo-950">
              {selectedIds.length} of {requests.length} WFH request{selectedIds.length > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-white/80 transition cursor-pointer"
            >
              Deselect All
            </button>
            {statusFilter === "Pending" && (
              <button
                onClick={() => setActionModal({ type: "bulk_approve" })}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Selected ({selectedIds.length})</span>
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition shadow-rose-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
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
                <th className="px-4 py-3.5 w-10 text-center">
                  <button 
                    type="button"
                    onClick={toggleSelectAll} 
                    className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                    title={requests.length > 0 && selectedIds.length === requests.length ? "Deselect all" : "Select all visible"}
                  >
                    {requests.length > 0 && selectedIds.length === requests.length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
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
                  <td colSpan={statusFilter === "Pending" ? 9 : 8} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading WFH requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={statusFilter === "Pending" ? 9 : 8} className="text-center py-10 text-slate-400 text-sm">
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
                      <td className="px-4 py-3.5 text-center">
                        <button 
                          type="button"
                          onClick={() => toggleSelect(r._id)} 
                          className="p-1 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                        </button>
                      </td>
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

      {/* ── ACTIVE WHITELISTED IPS & GEOLOCATION MODAL ── */}
      {showActiveWhitelistsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Whitelisted IPs & Remote Geolocation
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Live authorized employee networks, office GPS geofences, and remote access expiration windows
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActiveWhitelistsModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={whitelistSearch}
                  onChange={(e) => setWhitelistSearch(e.target.value)}
                  placeholder="Search employee, IP, or location..."
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#5D5FEF]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-xs font-bold text-slate-500">
                  Total Whitelists: <span className="text-[#5D5FEF] font-black">{filteredWhitelists.length}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchWhitelists}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <RefreshCw size={12} className={whitelistsLoading ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Revoke Success Notice */}
            {revokeSuccessMsg && (
              <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{revokeSuccessMsg}</span>
              </div>
            )}

            {/* Whitelists Content List */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {whitelistsLoading && whitelistsList.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#5D5FEF]" />
                  <p className="text-xs font-bold">Loading whitelisted IPs & locations...</p>
                </div>
              ) : filteredWhitelists.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center shadow-xs">
                    <Globe size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No whitelisted IP entries found</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    When employees request WFH and their requests are approved, their authorized IP and geolocation will appear here with live expiration countdowns.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWhitelists.map((wl) => {
                    const empName = wl.employee?.fullName || "Organization-Wide";
                    const empDept = wl.employee?.department || "All Departments";
                    const empEmail = wl.employee?.companyEmail || wl.employee?.email || "";
                    const empId = wl.employee?.employeeId || "";
                    const expiry = getExpiryDisplay(wl);
                    const isRevoking = revokingId === wl._id;

                    return (
                      <div
                        key={wl._id}
                        className={`bg-white rounded-2xl border p-5 transition-all shadow-xs hover:shadow-md ${
                          expiry.isExpired
                            ? "border-slate-200 opacity-60 bg-slate-50"
                            : "border-slate-200 hover:border-indigo-200"
                        }`}
                      >
                        {/* Top Row: Employee on Left, Status + Revoke Button on Right */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5D5FEF] flex items-center justify-center font-black text-xs shrink-0">
                              {wl.employee?.fullName ? (
                                wl.employee.fullName.substring(0, 2).toUpperCase()
                              ) : (
                                <Globe size={18} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-slate-800 truncate">{empName}</h4>
                                <span
                                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                                    wl.type === "WFH"
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : wl.scope === "Employee"
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}
                                >
                                  {wl.type === "WFH" ? "WFH Pass" : wl.scope}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                                {empDept} {empId ? `• ${empId}` : ""} {empEmail ? `• ${empEmail}` : ""}
                              </p>
                            </div>
                          </div>

                          {/* Expiration Tag + Revoke Action */}
                          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${expiry.tone}`}
                            >
                              <Clock size={12} />
                              <span>{expiry.badge}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRevokeWhitelist(wl._id, empName)}
                              disabled={isRevoking}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                            >
                              {isRevoking ? (
                                <>
                                  <RefreshCw size={12} className="animate-spin" />
                                  <span>Revoking...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 size={13} />
                                  <span>Revoke Access</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Bottom Row: IP and Geolocation details grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3.5">
                          {/* Whitelisted IP */}
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 rounded-lg bg-indigo-50 text-[#5D5FEF] shrink-0">
                                <Wifi size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Whitelisted IP Address</p>
                                <p className="text-xs font-black text-slate-800 font-mono truncate mt-0.5">
                                  {wl.ipAddress || "--"}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyIp(wl.ipAddress)}
                              title="Copy IP"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                            >
                              {copiedIp === wl.ipAddress ? (
                                <Check size={14} className="text-emerald-600" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>

                          {/* Geolocation */}
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                              <MapPin size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Authorized Geolocation / Network</p>
                              <p
                                className="text-xs font-bold text-slate-800 truncate mt-0.5"
                                title={wl.locationName || "Approved Network"}
                              >
                                {wl.locationName || "Approved Network"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Sub-footer timestamp */}
                        <div className="pt-2.5 mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                          <span>{expiry.text}</span>
                          {wl.notes && (
                            <span className="truncate max-w-xs text-slate-500" title={wl.notes}>
                              Notes: {wl.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 font-medium shrink-0">
              <span className="flex items-center gap-1.5 text-[11px]">
                <ShieldCheck size={14} className="text-[#5D5FEF]" />
                Revoking an access whitelist will immediately prevent the employee from remote check-in.
              </span>
              <button
                type="button"
                onClick={() => setShowActiveWhitelistsModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Close
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
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {selectedIds.length} WFH Request{selectedIds.length > 1 ? "s" : ""}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>
                You are about to permanently delete <strong>{selectedIds.length}</strong> selected Work From Home request{selectedIds.length > 1 ? "s" : ""}.
              </p>
              <p className="text-slate-500">
                Any pending approvals or attached IP whitelisting requests will be discarded.
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
