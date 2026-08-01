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
  getMySession: async () => {
    const res = await fetch(`${API_BASE}/my-session`, { headers: getHeaders() });
    return res.json();
  },

  // Get Today Summary Stats
  getSummary: async () => {
    const res = await fetch(`${API_BASE}/summary`, { headers: getHeaders() });
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
};
