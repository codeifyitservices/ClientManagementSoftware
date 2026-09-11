const API_BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/attendance`;
const AGENT_BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/agent`;

const getHeaders = () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const buildQueryString = (params = {}) => {
  if (!params || typeof params !== "object") return "";
  const clean = {};
  Object.keys(params).forEach((key) => {
    const val = params[key];
    if (
      val !== undefined &&
      val !== null &&
      val !== "undefined" &&
      val !== "null" &&
      val !== "all" &&
      val !== "All" &&
      val !== ""
    ) {
      clean[key] = val;
    }
  });
  return new URLSearchParams(clean).toString();
};

export const attendanceService = {
  // Check-In
  checkIn: async (data = {}) => {
    const res = await fetch(`${API_BASE}/check-in`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Start Break
  startBreak: async (data = {}) => {
    const res = await fetch(`${API_BASE}/start-break`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // End Break
  endBreak: async (data = {}) => {
    const res = await fetch(`${API_BASE}/end-break`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Check-Out
  checkOut: async (data = {}) => {
    const res = await fetch(`${API_BASE}/check-out`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Get My Attendance Session (Ultra Fast)
  getMySession: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/my-session?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Get Today Summary Stats
  getSummary: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/summary?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Get Attendance List with Filters & Pagination
  getList: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/list?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Get Record Details
  getDetails: async (id) => {
    const res = await fetch(`${API_BASE}/details/${id}`, { headers: getHeaders() });
    return res.json();
  },

  // Admin Manual Attendance Upsert
  manualUpsert: async (data) => {
    const res = await fetch(`${API_BASE}/manual`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Get Employees List for selection / override
  getEmployeesList: async (params = { limit: 500 }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    const query = buildQueryString(params);
    const res = await fetch(`${backendUrl}/api/employees?${query}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // Request Correction
  requestCorrection: async (data) => {
    const res = await fetch(`${API_BASE}/request-correction`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Approve Correction Request
  approveCorrection: async (data) => {
    const res = await fetch(`${API_BASE}/approve-correction`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Get Reports
  getReports: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/reports?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Desktop Agent Token Generation
  generatePairingToken: async (employeeId) => {
    const res = await fetch(`${AGENT_BASE}/generate-token`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ employeeId }),
    });
    return res.json();
  },

  // Save Attendance Note
  saveNote: async (data) => {
    const res = await fetch(`${API_BASE}/note`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ── Attendance Security & Geolocation Methods ──
  getSecurityStatus: async (lat = null, lng = null) => {
    const query = new URLSearchParams();
    if (lat !== null && lat !== undefined) query.append("latitude", lat);
    if (lng !== null && lng !== undefined) query.append("longitude", lng);
    const res = await fetch(`${API_BASE}/security-status?${query.toString()}`, { headers: getHeaders() });
    return res.json();
  },

  // Whitelists
  getWhitelists: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/whitelist?${query}`, { headers: getHeaders() });
    return res.json();
  },
  createWhitelist: async (data) => {
    const res = await fetch(`${API_BASE}/whitelist`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateWhitelist: async (id, data) => {
    const res = await fetch(`${API_BASE}/whitelist/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteWhitelist: async (id) => {
    const res = await fetch(`${API_BASE}/whitelist/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  // Locations
  getLocations: async () => {
    const res = await fetch(`${API_BASE}/locations`, { headers: getHeaders() });
    return res.json();
  },
  createLocation: async (data) => {
    const res = await fetch(`${API_BASE}/locations`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateLocation: async (id, data) => {
    const res = await fetch(`${API_BASE}/locations/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteLocation: async (id) => {
    const res = await fetch(`${API_BASE}/locations/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  // Work From Home (WFH) Requests
  createWfhRequest: async (data) => {
    const res = await fetch(`${API_BASE}/wfh-request`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  getWfhRequests: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/wfh-requests?${query}`, { headers: getHeaders() });
    return res.json();
  },
  approveWfhRequest: async (id, data = {}) => {
    const res = await fetch(`${API_BASE}/wfh-requests/${id}/approve`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  rejectWfhRequest: async (id, data = {}) => {
    const res = await fetch(`${API_BASE}/wfh-requests/${id}/reject`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Security Audit Logs
  getSecurityAuditLogs: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/audit-logs?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── UPGRADED ADMIN ATTENDANCE SERVICE METHODS ───────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  // Admin Dashboard
  getAdminDashboard: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/admin/dashboard?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Admin Live Attendance
  getAdminLiveAttendance: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/admin/live?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Admin Records
  getAdminRecords: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/admin/records?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Admin Calendar
  getAdminCalendar: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/admin/calendar?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Admin WFH Requests
  getAdminWfhRequests: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/admin/wfh-requests?${query}`, { headers: getHeaders() });
    return res.json();
  },
  bulkApproveWfh: async (data) => {
    const res = await fetch(`${API_BASE}/admin/wfh-requests/bulk-approve`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Admin Regularization Requests
  getAdminRegularizations: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/admin/regularizations?${query}`, { headers: getHeaders() });
    return res.json();
  },
  approveRegularization: async (id, data = {}) => {
    const res = await fetch(`${API_BASE}/admin/regularizations/${id}/approve`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  rejectRegularization: async (id, data = {}) => {
    const res = await fetch(`${API_BASE}/admin/regularizations/${id}/reject`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Admin Exceptions
  getAdminExceptions: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/admin/exceptions?${query}`, { headers: getHeaders() });
    return res.json();
  },
  updateExceptionStatus: async (id, data) => {
    const res = await fetch(`${API_BASE}/admin/exceptions/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  runExceptionDetection: async (data = {}) => {
    const res = await fetch(`${API_BASE}/admin/exceptions/detect`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Admin Employee Attendance Profile
  getAdminEmployeeProfile: async (employeeId, params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/admin/employee-profile/${employeeId}?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Admin Reports Data
  getAdminReportsData: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/admin/reports-data?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Admin Payroll Summary & Period Lock
  getAdminPayrollSummary: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/admin/payroll-summary?${query}`, { headers: getHeaders() });
    return res.json();
  },
  finalizePayrollPeriod: async (data) => {
    const res = await fetch(`${API_BASE}/admin/payroll-period/finalize`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  unlockPayrollPeriod: async (data) => {
    const res = await fetch(`${API_BASE}/admin/payroll-period/unlock`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Admin Attendance Policies
  getAdminPolicies: async () => {
    const res = await fetch(`${API_BASE}/admin/policies`, { headers: getHeaders() });
    return res.json();
  },
  updateAdminPolicies: async (data) => {
    const res = await fetch(`${API_BASE}/admin/policies`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Admin Audit Logs
  getAdminAuditLogs: async (params = {}) => {
    const query = buildQueryString(params);
    const res = await fetch(`${API_BASE}/admin/audit-logs?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Admin Detect Current Network & IP
  detectNetworkInfo: async () => {
    try {
      const pubRes = await fetch("https://api.ipify.org?format=json");
      const pubData = await pubRes.json();
      if (pubData?.ip) return pubData.ip;
    } catch (e) {
      // fallback to ipinfo if ipify fails
      try {
        const pubRes2 = await fetch("https://api.ipify.org?format=json");
        const pubData2 = await pubRes2.json();
        if (pubData2?.ip) return pubData2.ip;
      } catch (e2) {}
    }
    try {
      const res = await fetch(`${API_BASE}/admin/detect-network`, { headers: getHeaders() });
      const data = await res.json();
      if (data?.clientIp && data.clientIp !== "127.0.0.1" && data.clientIp !== "::1") {
        return data.clientIp;
      }
    } catch (e) {
      // fallback
    }
    return "127.0.0.1";
  },
};
