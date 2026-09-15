const { io } = require("socket.io-client");
const EventEmitter = require("events");
const config = require("../config");
const logger = require("../logger/logger");
const storage = require("../utils/storage");

class SocketClient extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.isConnected = false;
  }

  getServerUrl() {
    try {
      const url = new URL(config.apiBaseUrl);
      return url.origin; // e.g. http://localhost:5000
    } catch (err) {
      return "http://localhost:5000";
    }
  }

  connect() {
    const deviceToken = storage.getDeviceToken();
    const deviceId = storage.getDeviceId();

    if (!deviceToken) {
      logger.debug("[SocketClient] Skip connect: agent not paired");
      return;
    }

    if (this.socket && this.socket.connected) {
      return;
    }

    const serverUrl = this.getServerUrl();

    logger.info(`[SocketClient] Connecting to Socket.io gateway at ${serverUrl}`);

    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: {
        clientType: "desktop-agent",
        deviceId,
        deviceToken,
      },
    });

    this.socket.on("connect", () => {
      this.isConnected = true;
      logger.info(`[SocketClient] Connected to server successfully (Socket ID: ${this.socket.id})`);
      this.emit("connected");

      // Report initial state on connect
      const idleDetector = require("../idle/idleDetector");
      this.emitActivityChange(idleDetector.getCurrentStatus(), idleDetector.getSystemIdleSeconds());
    });

    this.socket.on("connect_error", (error) => {
      this.isConnected = false;
      logger.warn(`[SocketClient] Connection error: ${error.message}`);
      this.emit("connect_error", error);
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      logger.warn(`[SocketClient] Disconnected from server (Reason: ${reason})`);
      this.emit("disconnected", reason);
    });

    // Handle real-time attendance status changes pushed from Web / Server (e.g. Break started, Break ended)
    const handleStatusUpdate = (payload) => {
      if (!payload) return;
      logger.info("[SocketClient] Received real-time attendance update from server", payload);

      const idleDetector = require("../idle/idleDetector");
      const trayManager = require("../tray/trayManager");
      const currentStatus = payload.currentStatus || payload.status;

      if (currentStatus === "On Break") {
        if (!idleDetector.isBreak()) {
          idleDetector.setBreakState(true);
          trayManager.updateTrayStatus("On Break");
        }
      } else if (currentStatus === "Working" || currentStatus === "Active") {
        if (idleDetector.isBreak()) {
          idleDetector.setBreakState(false);
          trayManager.updateTrayStatus("Active");
        }
      } else if (currentStatus === "Checked Out") {
        idleDetector.setBreakState(false);
        idleDetector.setStatus("Checked Out");
        trayManager.updateTrayStatus("Checked Out");
      }

      this.emit("status-updated", currentStatus);
    };

    this.socket.on("attendance:update", handleStatusUpdate);
    this.socket.on("attendance:status-changed", handleStatusUpdate);
  }

  /**
   * Instantly push activity change to server (Active <-> Idle <-> Offline)
   */
  emitActivityChange(status, idleSeconds = 0) {
    if (!this.socket || !this.socket.connected) {
      logger.debug("[SocketClient] Cannot emit activity change: socket not connected");
      return false;
    }

    try {
      this.socket.emit("agent:activity-change", {
        status,
        idleSeconds: typeof idleSeconds === "number" ? idleSeconds : 0,
        timestamp: new Date().toISOString(),
      });
      logger.info(`[SocketClient] Emitted activity change: ${status} (${idleSeconds}s idle)`);
      return true;
    } catch (err) {
      logger.error("[SocketClient] Failed to emit activity change", err);
      return false;
    }
  }

  disconnect() {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (err) {}
      this.socket = null;
      this.isConnected = false;
      logger.info("[SocketClient] Disconnected cleanly");
    }
  }
}

module.exports = new SocketClient();
