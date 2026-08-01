const log = require("electron-log");
const path = require("path");
const config = require("../config");

// Configure electron-log file location and format
log.transports.file.level = config.logLevel;
log.transports.console.level = config.environment === "development" ? "debug" : "info";

// Rotation config: max size 5MB
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

/**
 * Structured logger for Desktop Agent
 */
const logger = {
  info: (message, meta = {}) => {
    log.info(`${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`);
  },
  warn: (message, meta = {}) => {
    log.warn(`${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`);
  },
  error: (message, error = null, meta = {}) => {
    const errorDetails = error ? ` | Error: ${error.message || error}` : "";
    log.error(`${message}${errorDetails} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`);
  },
  debug: (message, meta = {}) => {
    log.debug(`${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`);
  },
  
  // Specialized operational log functions
  logStartup: () => logger.info("=== Application Started ===", { version: config.version, env: config.environment }),
  logShutdown: () => logger.info("=== Application Shutting Down ==="),
  logPairing: (status, details = {}) => logger.info(`[PAIRING] ${status}`, details),
  logLogin: (employeeId) => logger.info("[AUTH] Login successful", { employeeId }),
  logLogout: (reason) => logger.info("[AUTH] Logout triggered", { reason }),
  logHeartbeat: (status, queuedCount = 0) => logger.info("[HEARTBEAT] Sent status sync", { status, queuedCount }),
  logIdle: (state, idleSeconds) => logger.info("[IDLE] System activity state changed", { state, idleSeconds }),
  logBreakStart: () => logger.info("[BREAK] Break mode started manually by employee"),
  logBreakEnd: () => logger.info("[BREAK] Break mode ended, resuming normal work tracking"),
};

module.exports = logger;
