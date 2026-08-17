const API_BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/attendance`;
const AGENT_BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/agent`;

const getHeaders = () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/my-session?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Get Today Summary Stats
  getSummary: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/summary?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Get Attendance List with Filters & Pagination
  getList: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
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
};
