import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Globe,
  MapPin,
  Home,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AttendanceSecurityAdmin({ token }) {
  const [activeTab, setActiveTab] = useState("whitelists");
  const [loading, setLoading] = useState(true);

  // Data states
  const [whitelists, setWhitelists] = useState([]);
  const [locations, setLocations] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Modals
  const [showAddWhitelistModal, setShowAddWhitelistModal] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Manual Whitelist Form State
  const [wlForm, setWlForm] = useState({
    ipAddress: "",
    scope: "Organization",
    employeeId: "",
    locationName: "Office Network",
    expiryType: "Never",
    customExpiryDate: "",
    type: "Permanent",
    notes: "",
  });

  // Location Form State
  const [locForm, setLocForm] = useState({
    locationName: "Main Office",
    latitude: "",
    longitude: "",
    radiusMeters: 200,
    isOrgWide: true,
    employeeId: "",
    address: "",
  });

  const [saving, setSaving] = useState(false);
  const [actionProcessingId, setActionProcessingId] = useState(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [wlRes, locRes, wfhRes, auditRes, empRes] = await Promise.allSettled([
        attendanceService.getWhitelists({ status: statusFilter, search: searchQuery }),
        attendanceService.getLocations(),
        attendanceService.getWfhRequests(),
        attendanceService.getSecurityAuditLogs({ search: searchQuery }),
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees`, {
          headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` },
        }).then((r) => r.json()),
      ]);

      if (wlRes.status === "fulfilled" && wlRes.value.success) {
        setWhitelists(wlRes.value.whitelists || []);
      }
      if (locRes.status === "fulfilled" && locRes.value.success) {
        setLocations(locRes.value.locations || []);
      }
      if (wfhRes.status === "fulfilled" && wfhRes.value.success) {
        setWfhRequests(wfhRes.value.requests || []);
      }
      if (auditRes.status === "fulfilled" && auditRes.value.success) {
        setAuditLogs(auditRes.value.logs || []);
      }
      if (empRes.status === "fulfilled" && Array.isArray(empRes.value)) {
        setEmployees(empRes.value);
      }
    } catch (err) {
      console.error("Error fetching attendance security data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [activeTab, statusFilter]);

  // Handle Manual Whitelist Creation
  const handleCreateWhitelist = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await attendanceService.createWhitelist(wlForm);
      if (res.success) {
        alert("IP Whitelist entry created successfully!");
        setShowAddWhitelistModal(false);
        setWlForm({
          ipAddress: "",
          scope: "Organization",
          employeeId: "",
          locationName: "Office Network",
          expiryType: "Never",
          customExpiryDate: "",
          type: "Permanent",
          notes: "",
        });
        fetchAllData();
      } else {
        alert(res.message || "Failed to create whitelist");
      }
    } catch (err) {
      alert("Error creating whitelist entry");
    } finally {
      setSaving(false);
    }
  };

  // Handle Location Creation
  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await attendanceService.createLocation(locForm);
      if (res.success) {
        alert("Location registered successfully!");
        setShowAddLocationModal(false);
        setLocForm({
          locationName: "Main Office",
          latitude: "",
          longitude: "",
          radiusMeters: 200,
          isOrgWide: true,
          employeeId: "",
          address: "",
        });
        fetchAllData();
      } else {
        alert(res.message || "Failed to register location");
      }
    } catch (err) {
      alert("Error registering location");
    } finally {
      setSaving(false);
    }
  };

  // Delete Whitelist
  const handleDeleteWhitelist = async (id) => {
    if (!window.confirm("Are you sure you want to delete this whitelisted IP entry?")) return;
    try {
      const res = await attendanceService.deleteWhitelist(id);
      if (res.success) {
        fetchAllData();
      }
    } catch (err) {
      alert("Failed to delete whitelist");
    }
  };

  // Delete Location
  const handleDeleteLocation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this office location?")) return;
    try {
      const res = await attendanceService.deleteLocation(id);
      if (res.success) {
        fetchAllData();
      }
    } catch (err) {
      alert("Failed to delete location");
    }
  };

  // Approve WFH Request
  const handleApproveWfh = async (id) => {
    setActionProcessingId(id);
    try {
      const res = await attendanceService.approveWfhRequest(id);
      if (res.success) {
        alert(res.message || "WFH Request Approved and Temporary Whitelist Activated!");
        fetchAllData();
      } else {
        alert(res.message || "Failed to approve WFH request");
      }
    } catch (err) {
      alert("Error approving WFH request");
    } finally {
      setActionProcessingId(null);
    }
  };

  // Reject WFH Request
  const handleRejectWfh = async (id) => {
    const reason = window.prompt("Enter rejection reason (optional):");
    if (reason === null) return;
    setActionProcessingId(id);
    try {
      const res = await attendanceService.rejectWfhRequest(id, { rejectionReason: reason });
      if (res.success) {
        alert("WFH request rejected");
        fetchAllData();
      } else {
        alert(res.message || "Failed to reject WFH request");
      }
    } catch (err) {
      alert("Error rejecting WFH request");
    } finally {
      setActionProcessingId(null);
    }
  };

  // Sub-tabs configuration
  const securityTabs = [
    { id: "whitelists", label: "IP Whitelist Rules", icon: Globe, count: whitelists.length },
    { id: "locations", label: "Office Geofences & Radius", icon: MapPin, count: locations.length },
    {
      id: "wfh",
      label: "WFH Requests",
      icon: Home,
      count: wfhRequests.filter((r) => r.status === "Pending").length,
      badge: wfhRequests.filter((r) => r.status === "Pending").length > 0,
    },
    { id: "audit", label: "Security Audit Logs", icon: FileText, count: auditLogs.length },
  ];

  return (
    <div className="space-y-6 font-sans select-none animate-fade-in pb-12 text-slate-800">
      {/* Security Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white custom-shadow border border-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-[#5D5FEF]/20 text-[#5D5FEF] border border-[#5D5FEF]/30">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Attendance Security & Whitelisting</h2>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Configure network IP whitelists, office GPS geofences, and manage employee Work From Home approvals
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchAllData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 transition cursor-pointer text-white border border-white/10"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          {activeTab === "whitelists" && (
            <button
              onClick={() => setShowAddWhitelistModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#5D5FEF] hover:bg-[#4d4fdf] transition cursor-pointer text-white shadow-sm shadow-indigo-500/20"
            >
              <Plus size={15} />
              <span>Add IP Whitelist</span>
            </button>
          )}
          {activeTab === "locations" && (
            <button
              onClick={() => setShowAddLocationModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#5D5FEF] hover:bg-[#4d4fdf] transition cursor-pointer text-white shadow-sm shadow-indigo-500/20"
            >
              <Plus size={15} />
              <span>Register Office Geofence</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 custom-shadow">
        {securityTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#5D5FEF] text-white shadow-sm shadow-indigo-500/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                  {t.count}
                </span>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: IP Whitelist Rules */}
      {activeTab === "whitelists" && (
        <div className="bg-white border border-slate-100 rounded-2xl custom-shadow overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search IP address or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead className="bg-slate-50/70 uppercase text-[10px] font-extrabold text-slate-450 tracking-wider">
                <tr>
                  <th className="p-3.5">IP Address</th>
                  <th className="p-3.5">Scope</th>
                  <th className="p-3.5">Assigned Employee</th>
                  <th className="p-3.5">Location / Network</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Expiry</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {whitelists.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                      No IP whitelist rules found. Click "Add IP Whitelist" to authorize a network.
                    </td>
                  </tr>
                ) : (
                  whitelists.map((wl) => (
                    <tr key={wl._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-bold text-indigo-700 font-mono whitespace-nowrap">
                        {wl.ipAddress}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            wl.scope === "Organization"
                              ? "bg-purple-50 text-purple-700 border-purple-100"
                              : "bg-blue-50 text-blue-700 border-blue-100"
                          }`}
                        >
                          {wl.scope}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-900 font-bold">
                        {wl.employee ? wl.employee.fullName : "Organization Wide"}
                      </td>
                      <td className="p-3.5 text-slate-600">{wl.locationName}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            wl.type === "WFH"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : wl.type === "Temporary"
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {wl.type}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {wl.expiresAt
                          ? new Date(wl.expiresAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never (Permanent)"}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            wl.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : wl.status === "Expired"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {wl.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteWhitelist(wl._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition cursor-pointer border border-slate-200"
                          title="Delete Whitelist Entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Office Geofences & Radius */}
      {activeTab === "locations" && (
        <div className="bg-white border border-slate-100 rounded-2xl custom-shadow overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Registered Geofences & Office Coordinates</h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Employees within the configured GPS radius (e.g. 200m) will pass location validation
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead className="bg-slate-50/70 uppercase text-[10px] font-extrabold text-slate-450 tracking-wider">
                <tr>
                  <th className="p-3.5">Location Name</th>
                  <th className="p-3.5">Scope</th>
                  <th className="p-3.5">GPS Coordinates</th>
                  <th className="p-3.5">Allowed Radius</th>
                  <th className="p-3.5">Address</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {locations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                      No office geofences configured. Click "Register Office Geofence" to set GPS coordinates.
                    </td>
                  </tr>
                ) : (
                  locations.map((loc) => (
                    <tr key={loc._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{loc.locationName}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {loc.isOrgWide ? "Organization Wide" : "Employee Specific"}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600">{loc.radiusMeters} meters</td>
                      <td className="p-3.5 text-slate-500 max-w-xs truncate">{loc.address || "—"}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {loc.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteLocation(loc._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition cursor-pointer border border-slate-200"
                          title="Delete Geofence"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WFH Requests Approval Queue */}
      {activeTab === "wfh" && (
        <div className="bg-white border border-slate-100 rounded-2xl custom-shadow overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Work From Home Approval Queue</h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Approving a request automatically creates a temporary IP whitelist for that employee
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead className="bg-slate-50/70 uppercase text-[10px] font-extrabold text-slate-450 tracking-wider">
                <tr>
                  <th className="p-3.5">Employee</th>
                  <th className="p-3.5">Requested Duration</th>
                  <th className="p-3.5">Captured IP & Location</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Request Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {wfhRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                      No WFH requests submitted.
                    </td>
                  </tr>
                ) : (
                  wfhRequests.map((req) => {
                    const isPending = req.status === "Pending";
                    const isProcessing = actionProcessingId === req._id;

                    return (
                      <tr key={req._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">
                            {req.employee?.fullName || "Employee"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {req.employee?.designation || req.employee?.email || ""}
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-indigo-600">
                          {req.duration || "1 Day"}
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                            {new Date(req.startDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-slate-800 block">
                            {req.requestIp || "Unknown IP"}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                            {req.requestLocation || "Remote Network"}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-xs truncate">{req.reason || "No reason"}</td>
                        <td className="p-3.5 text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              req.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : req.status === "Rejected"
                                ? "bg-red-50 text-red-700 border-red-100"
                                : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveWfh(req._id)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-sm"
                              >
                                {isProcessing ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={13} />
                                )}
                                <span>Approve WFH</span>
                              </button>
                              <button
                                onClick={() => handleRejectWfh(req._id)}
                                disabled={isProcessing}
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 text-xs font-bold transition cursor-pointer"
                              >
                                <XCircle size={13} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Reviewed by {req.reviewedBy?.fullName || "Admin"}
                            </span>
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
      )}

      {/* TAB 4: Security Audit Trail */}
      {activeTab === "audit" && (
        <div className="bg-white border border-slate-100 rounded-2xl custom-shadow overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Attendance Security Audit Trail</h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Complete history of IP whitelists, WFH approvals, allowed check-ins, and blocked access attempts
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-700">
              <thead className="bg-slate-50/70 uppercase text-[10px] font-extrabold text-slate-450 tracking-wider">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Target Employee</th>
                  <th className="p-3.5">IP Address</th>
                  <th className="p-3.5">Location / Context</th>
                  <th className="p-3.5">Reason & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-semibold">
                      No security audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            log.action === "CHECKIN_ALLOWED" || log.action === "WFH_APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : log.action === "CHECKIN_BLOCKED" || log.action === "WFH_REJECTED"
                              ? "bg-red-50 text-red-700 border-red-100"
                              : "bg-indigo-50 text-indigo-700 border-indigo-100"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {log.employee ? log.employee.fullName : "Organization / System"}
                      </td>
                      <td className="p-3.5 font-mono text-indigo-700">{log.ip || "—"}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{log.location || "—"}</td>
                      <td className="p-3.5 text-slate-500 max-w-md">{log.reason || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add Manual IP Whitelist */}
      {showAddWhitelistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-md w-full custom-shadow overflow-hidden border border-slate-100">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-black">Add Manual IP Whitelist Entry</h3>
              <button
                onClick={() => setShowAddWhitelistModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateWhitelist} className="p-5 space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">
                  Public IP Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 203.0.113.10"
                  value={wlForm.ipAddress}
                  onChange={(e) => setWlForm({ ...wlForm, ipAddress: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">
                    Scope
                  </label>
                  <select
                    value={wlForm.scope}
                    onChange={(e) => setWlForm({ ...wlForm, scope: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    <option value="Organization">Organization Wide</option>
                    <option value="Employee">Employee Specific</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">
                    Whitelist Type
                  </label>
                  <select
                    value={wlForm.type}
                    onChange={(e) => setWlForm({ ...wlForm, type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Temporary">Temporary</option>
                    <option value="WFH">WFH</option>
                  </select>
                </div>
              </div>

              {wlForm.scope === "Employee" && (
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">
                    Select Employee
                  </label>
                  <select
                    value={wlForm.employeeId}
                    onChange={(e) => setWlForm({ ...wlForm, employeeId: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">
                  Location / Network Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Head Office Primary Wi-Fi"
                  value={wlForm.locationName}
                  onChange={(e) => setWlForm({ ...wlForm, locationName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">
                  Expiry Duration
                </label>
                <select
                  value={wlForm.expiryType}
                  onChange={(e) => setWlForm({ ...wlForm, expiryType: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  <option value="Never">Never (Permanent)</option>
                  <option value="24 Hours">24 Hours</option>
                  <option value="1 Day">1 Day</option>
                  <option value="1 Week">1 Week</option>
                  <option value="1 Month">1 Month</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWhitelistModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-5 py-2 rounded-xl transition"
                >
                  {saving ? "Saving..." : "Add Whitelist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Office Geofence */}
      {showAddLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-md w-full custom-shadow overflow-hidden border border-slate-100">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-black">Register Office Geofence Coordinates</h3>
              <button
                onClick={() => setShowAddLocationModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateLocation} className="p-5 space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">
                  Location Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Registered Office HQ"
                  value={locForm.locationName}
                  onChange={(e) => setLocForm({ ...locForm, locationName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="28.4595"
                    value={locForm.latitude}
                    onChange={(e) => setLocForm({ ...locForm, latitude: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="77.0266"
                    value={locForm.longitude}
                    onChange={(e) => setLocForm({ ...locForm, longitude: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">
                  Allowed Radius (Meters)
                </label>
                <input
                  type="number"
                  required
                  placeholder="200"
                  value={locForm.radiusMeters}
                  onChange={(e) => setLocForm({ ...locForm, radiusMeters: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">
                  Office Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sector 44, Gurgaon, Haryana"
                  value={locForm.address}
                  onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-5 py-2 rounded-xl transition"
                >
                  {saving ? "Registering..." : "Save Geofence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
