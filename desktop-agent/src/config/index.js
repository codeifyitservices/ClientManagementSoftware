const path = require("path");
const dotenv = require("dotenv");

// Load .env file from app directory
dotenv.config({ path: path.join(__dirname, "../../.env") });

const config = {
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000/api/agent",
  updateUrl: process.env.UPDATE_URL || "https://updates.company.com/desktop-agent",
  environment: process.env.ENVIRONMENT || "development",
  
  // Timing rules in milliseconds for intervals, seconds in config
  heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL || "5", 10) * 1000,
  idleTimeoutSeconds: parseInt(process.env.IDLE_TIMEOUT || "900", 10), // 15 mins default (900 seconds)
  
  // Security
  rejectUnauthorizedCerts: process.env.REJECT_UNAUTHORIZED_CERTS === "true",
  
  // Logging
  logLevel: process.env.LOG_LEVEL || "info",
  
  // App Metadata
  appProtocol: "desktop-agent",
  appName: "Company Desktop Agent",
  version: "1.0.1",
};

module.exports = config;
