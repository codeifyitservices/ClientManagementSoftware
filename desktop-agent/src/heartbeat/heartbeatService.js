const { net } = require("electron");
const EventEmitter = require("events");
const config = require("../config");
const logger = require("../logger/logger");
const machineInfo = require("../utils/machineInfo");
const storage = require("../utils/storage");
const agentApi = require("../api/agentApi");
const authManager = require("../auth/authManager");
const idleDetector = require("../idle/idleDetector");
const notifier = require("../utils/notifier");

class HeartbeatService extends EventEmitter {
  constructor() {
    super();
    this.intervalMs = config.heartbeatIntervalMs;
    this.timer = null;
    this.offlineQueue = [];
    this.isOnline = true;
    this.consecutiveFailures = 0;
  }

  start() {
    if (this.timer) clearInterval(this.timer);

    logger.info(`Starting Heartbeat Service (Interval: ${this.intervalMs / 1000}s)`);

    // Perform initial sync check
    this.sendHeartbeat();

    // Schedule regular heartbeat interval
    this.timer = setInterval(() => this.sendHeartbeat(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  checkOnlineStatus() {
    return net.isOnline();
  }

  /**
   * Main periodic heartbeat execution
   */
  async sendHeartbeat() {
    if (!authManager.isPaired()) {
      logger.debug("Heartbeat skipped: Device is not paired yet");
      return;
    }

    const currentOnline = this.checkOnlineStatus();

    // Check online status transition
    if (this.isOnline && !currentOnline) {
      this.isOnline = false;
      logger.warn("Offline detected");
      notifier.notifyConnectionLost();
      this.emit("connectivity-changed", false);
    } else if (!this.isOnline && currentOnline) {
      this.isOnline = true;
      logger.info("Online connection restored");
      notifier.notifyConnectionRestored();
      this.emit("connectivity-changed", true);
      await this.flushOfflineQueue();
    }

    const payload = {
      deviceId: authManager.getDeviceId(),
      employeeId: authManager.getEmployeeId(),
      status: idleDetector.getCurrentStatus(),
      idleTime: idleDetector.getSystemIdleSeconds(),
      agentVersion: config.version,
      computerName: machineInfo.getComputerName(),
      os: machineInfo.getOperatingSystem(),
      timestamp: new Date().toISOString(),
    };

    const response = await agentApi.sendHeartbeat(payload);

    if (response && response.success) {
      this.consecutiveFailures = 0;
      storage.setLastSync(new Date().toISOString());

      if (response.status === "On Break" && !idleDetector.isManualBreak()) {
        idleDetector.setManualBreak(true);
      } else if ((response.status === "Working" || response.status === "Active") && idleDetector.isManualBreak()) {
        idleDetector.setManualBreak(false);
      }

      logger.logHeartbeat(response.status || payload.status, this.offlineQueue.length);
      this.emit("heartbeat-success", response);
    } else {
      this.consecutiveFailures++;
      logger.warn(`Heartbeat sync failed (${this.consecutiveFailures} consecutive attempts). Queueing payload.`);
      this.offlineQueue.push(payload);

      // Keep max 100 offline heartbeats queued to prevent memory growth
      if (this.offlineQueue.length > 100) {
        this.offlineQueue.shift();
      }

      this.emit("heartbeat-failed", payload);
    }
  }

  /**
   * Flush queued offline heartbeats after reconnection
   */
  async flushOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    logger.info(`Flushing ${this.offlineQueue.length} queued offline heartbeat payloads`);
    const queueToFlush = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of queueToFlush) {
      const res = await agentApi.sendHeartbeat(item);
      if (!res || !res.success) {
        // Re-queue remaining if backend drops connection
        this.offlineQueue.push(item);
        break;
      }
    }
    logger.info("Offline queue flush complete");
  }

  /**
   * Trigger immediate manual sync from user tray menu or UI button
   */
  async forceSyncNow() {
    logger.info("Manual force sync triggered by user");
    await this.flushOfflineQueue();
    await this.sendHeartbeat();
  }
}

module.exports = new HeartbeatService();
