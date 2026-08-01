const axios = require("axios");
const https = require("https");
const config = require("../config");
const storage = require("../utils/storage");
const logger = require("../logger/logger");

/**
 * Configure Axios API Client instance
 */
const httpsAgent = new https.Agent({
  rejectUnauthorized: config.rejectUnauthorizedCerts,
});

const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 10000, // 10s timeout
  httpsAgent,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Agent-Version": config.version,
  },
});

// Request Interceptor: Attach X-Device-Token if present
apiClient.interceptors.request.use(
  (reqConfig) => {
    const deviceToken = storage.getDeviceToken();
    if (deviceToken) {
      reqConfig.headers["X-Device-Token"] = deviceToken;
      reqConfig.headers["Authorization"] = `Bearer ${deviceToken}`;
    }
    return reqConfig;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle connection errors & logging
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || !error.response) {
      logger.warn(`[API] Server unreachable: ${error.config?.url || "request"}`);
    } else if (error.response?.status === 401) {
      logger.warn("[API] Device token unauthorized or revoked");
    } else {
      logger.error(`[API] HTTP Error ${error.response?.status}`, error);
    }
    return Promise.reject(error);
  }
);

module.exports = apiClient;
