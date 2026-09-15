import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const LOCAL_AGENT_URL = "http://127.0.0.1:49152";

class WebClientSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  getSocket() {
    if (!this.socket) {
      this.init();
    }
    return this.socket;
  }

  init() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    this.socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: {
        clientType: "web",
        token,
      },
    });

    this.socket.on("connect", () => {
      this.isConnected = true;
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
    });
  }

  joinEmployeeRoom(employeeId) {
    if (!this.socket) this.init();
    if (employeeId) {
      this.socket.emit("join:employee", employeeId);
    }
  }

  subscribeToAttendance(callback) {
    const s = this.getSocket();
    s.on("attendance:update", callback);
    return () => {
      s.off("attendance:update", callback);
    };
  }

  subscribeToAgentConnection(callback) {
    const s = this.getSocket();
    s.on("agent:connection-change", callback);
    return () => {
      s.off("agent:connection-change", callback);
    };
  }

  subscribeToAgentPaired(callback) {
    const s = this.getSocket();
    s.on("agent:paired", callback);
    return () => {
      s.off("agent:paired", callback);
    };
  }

  /**
   * Probe local machine loopback server on 127.0.0.1:49152 to detect if Desktop Agent is running locally
   */
  async pingLocalAgent(timeoutMs = 1200) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${LOCAL_AGENT_URL}/health`, {
        method: "GET",
        mode: "cors",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { isRunning: true, ...data };
      }
      return { isRunning: false };
    } catch (err) {
      clearTimeout(timeoutId);
      return { isRunning: false };
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const socketService = new WebClientSocketService();
export default socketService;
