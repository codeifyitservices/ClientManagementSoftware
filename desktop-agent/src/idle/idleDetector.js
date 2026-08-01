const { powerMonitor } = require("electron");
const EventEmitter = require("events");
const config = require("../config");
const logger = require("../logger/logger");

class IdleDetector extends EventEmitter {
  constructor() {
    super();
    this.idleTimeoutSeconds = config.idleTimeoutSeconds;
    this.currentStatus = "Active"; // Active | Idle | On Break | Offline
    this.manualBreak = false;
    this.timer = null;
  }

  start() {
    if (this.timer) clearInterval(this.timer);

    logger.info(`Starting idle detector (Idle threshold: ${this.idleTimeoutSeconds} seconds)`);

    // Check system idle time every 5 seconds
    this.timer = setInterval(() => this.checkIdleState(), 5000);

    // Also register native powerMonitor listeners
    powerMonitor.on("suspend", () => {
      logger.info("System suspended (sleep mode)");
      this.setStatus("Offline");
    });

    powerMonitor.on("resume", () => {
      logger.info("System resumed from sleep");
      if (!this.manualBreak) {
        this.setStatus("Active");
      }
    });

    powerMonitor.on("lock-screen", () => {
      logger.info("Workstation locked by user");
      if (!this.manualBreak) {
        this.setStatus("Idle");
      }
    });

    powerMonitor.on("unlock-screen", () => {
      logger.info("Workstation unlocked by user");
      if (!this.manualBreak) {
        this.setStatus("Active");
      }
    });
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getSystemIdleSeconds() {
    try {
      return powerMonitor.getSystemIdleTime();
    } catch (err) {
      return 0;
    }
  }

  checkIdleState() {
    if (this.manualBreak) {
      // Manual Break takes precedence over system idle calculations
      return;
    }

    const idleSeconds = this.getSystemIdleSeconds();

    if (idleSeconds >= this.idleTimeoutSeconds && this.currentStatus !== "Idle") {
      logger.logIdle("Idle", idleSeconds);
      this.setStatus("Idle");
    } else if (idleSeconds < this.idleTimeoutSeconds && this.currentStatus === "Idle") {
      logger.logIdle("Active", idleSeconds);
      this.setStatus("Active");
    }
  }

  setManualBreak(onBreak) {
    this.manualBreak = onBreak;
    if (onBreak) {
      logger.logBreakStart();
      this.setStatus("On Break");
    } else {
      logger.logBreakEnd();
      const idleSeconds = this.getSystemIdleSeconds();
      if (idleSeconds >= this.idleTimeoutSeconds) {
        this.setStatus("Idle");
      } else {
        this.setStatus("Active");
      }
    }
  }

  isManualBreak() {
    return this.manualBreak;
  }

  setStatus(newStatus) {
    if (this.currentStatus !== newStatus) {
      const oldStatus = this.currentStatus;
      this.currentStatus = newStatus;
      logger.info(`Status changed from ${oldStatus} -> ${newStatus}`);
      this.emit("status-changed", { oldStatus, newStatus, idleSeconds: this.getSystemIdleSeconds() });
    }
  }

  getCurrentStatus() {
    return this.currentStatus;
  }
}

module.exports = new IdleDetector();
