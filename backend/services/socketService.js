import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import AgentSession from "../models/agentSessionModel.js";
import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";

let io = null;

// Registry of active agent socket connections: employeeId -> { socketId, deviceId, computerName, connectedAt }
const connectedAgents = new Map();

// Active disconnect timers for 5-minute grace window: employeeId -> timerRef
const disconnectGraceTimers = new Map();

/**
 * Helper to normalize employee identifiers to a consistent room key
 */
export const normalizeEmployeeKey = (emp) => {
  if (!emp) return null;
  return emp.toString().trim();
};

/**
 * Helper to resolve Employee from various identifier types
 */
async function resolveEmployee(identifier) {
  if (!identifier) return null;
  try {
    const mongoose = await import("mongoose");
    const isObjectId = mongoose.default.Types.ObjectId.isValid(identifier);

    return await Employee.findOne({
      $or: [
        { employeeId: identifier },
        ...(isObjectId ? [{ _id: identifier }] : []),
        { companyEmail: identifier },
        { personalEmail: identifier },
        { email: identifier },
      ],
    });
  } catch (err) {
    return null;
  }
}

/**
 * Mark employee attendance as Inactive after 5-minute disconnection grace period expires
 */
async function markAttendanceInactiveDueToDisconnect(employeeId) {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const employee = await resolveEmployee(employeeId);
    if (!employee) return;

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: todayStr,
      currentStatus: "Working",
    });

    if (attendance) {
      attendance.currentStatus = "Inactive";
      attendance.timeline.push({
        eventType: "Became Inactive",
        timestamp: new Date(),
        description: "Desktop agent disconnected for over 5 minutes (Grace period expired)",
        source: "Desktop Agent (Auto-Timeout)",
      });
      await attendance.save();

      // Broadcast update to web clients
      broadcastToEmployee(employee.employeeId || employee._id.toString(), "attendance:update", {
        currentStatus: "Inactive",
        attendance,
        isAgentConnected: false,
        inGracePeriod: false,
      });

      console.log(`[SocketService] 5-minute grace expired: Employee ${employee.employeeId || employee._id} marked Inactive`);
    }
  } catch (err) {
    console.error("[SocketService] Error marking attendance inactive after grace:", err);
  }
}

/**
 * Initialize Socket.io Server
 */
export const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth || {};
      const query = socket.handshake.query || {};

      const token = auth.token || query.token;
      const clientType = auth.clientType || query.clientType || "web"; // "web" or "desktop-agent"
      const deviceId = auth.deviceId || query.deviceId;
      const deviceToken = auth.deviceToken || query.deviceToken;

      if (clientType === "desktop-agent") {
        if (!deviceId || !deviceToken) {
          return next(new Error("Authentication failed: deviceId and deviceToken required for desktop agent"));
        }

        let session = await AgentSession.findOne({ deviceId, deviceToken, isPaired: true });
        if (!session) {
          session = await AgentSession.findOne({ deviceId, isPaired: true });
          if (session) {
            console.log(`[SocketService] Device token synchronized for paired device: ${deviceId}`);
            session.deviceToken = deviceToken;
            await session.save();
          }
        }
        if (!session) {
          return next(new Error("Authentication failed: invalid or unpaired desktop agent credentials"));
        }

        const emp = await resolveEmployee(session.employeeId);
        const canonicalEmpId = emp ? (emp.employeeId || emp._id.toString()) : session.employeeId;

        socket.data.clientType = "desktop-agent";
        socket.data.deviceId = deviceId;
        socket.data.employeeId = session.employeeId;
        socket.data.canonicalEmpId = canonicalEmpId;
        socket.data.computerName = session.computerName;
        return next();
      }

      // Default: Web client authenticated via JWT
      if (token) {
        try {
          if (!process.env.JWT_SECRET) {
            return next(new Error("Authentication failed: server JWT secret not configured"));
          }
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.data.clientType = "web";
          socket.data.userId = decoded.id;
          const emp = await resolveEmployee(decoded.id);
          socket.data.canonicalEmpId = emp ? (emp.employeeId || emp._id.toString()) : decoded.id;
          return next();
        } catch (jwtErr) {
          return next(new Error("Authentication failed: invalid JWT token"));
        }
      }

      // Allow public connections (e.g. login or pairing screen) with unauthenticated status
      socket.data.clientType = "unauthenticated";
      return next();
    } catch (err) {
      return next(new Error("Authentication error: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    const { clientType, deviceId, canonicalEmpId, computerName, userId } = socket.data;

    // Handle Desktop Agent connection
    if (clientType === "desktop-agent" && canonicalEmpId) {
      socket.join(`emp_${canonicalEmpId}`);
      socket.join(`agent_${deviceId}`);

      // Clear any pending 5-minute disconnect grace timer
      if (disconnectGraceTimers.has(canonicalEmpId)) {
        clearTimeout(disconnectGraceTimers.get(canonicalEmpId));
        disconnectGraceTimers.delete(canonicalEmpId);
        console.log(`[SocketService] Cancelled disconnect grace timer for ${canonicalEmpId} (Reconnected within 5m)`);
      }

      connectedAgents.set(canonicalEmpId, {
        socketId: socket.id,
        deviceId,
        computerName,
        connectedAt: new Date(),
      });

      console.log(`[SocketService] Desktop agent connected for employee: ${canonicalEmpId} (${computerName})`);

      // Notify web clients that agent is actively connected
      broadcastToEmployee(canonicalEmpId, "agent:connection-change", {
        isAgentConnected: true,
        inGracePeriod: false,
        deviceId,
        computerName,
      });

      // Handle real-time activity changes from desktop agent (idle / active)
      socket.on("agent:activity-change", async (payload) => {
        console.log(`[SocketService] Received agent:activity-change from ${canonicalEmpId}:`, payload);
        try {
          const { status, idleSeconds } = payload || {};
          const { syncAgentActivity } = await import("../controllers/attendanceController.js");

          const syncRes = await syncAgentActivity({
            deviceId,
            employeeCustomId: canonicalEmpId,
            status: status || "Active",
            idleTimeSeconds: typeof idleSeconds === "number" ? idleSeconds : 0,
            computerName,
          });

          // Instantly broadcast synced attendance status to Web UI
          broadcastToEmployee(canonicalEmpId, "attendance:update", {
            currentStatus: syncRes?.serverStatus || status,
            idleTimeSeconds: idleSeconds || 0,
            isAgentConnected: true,
            inGracePeriod: false,
          });
        } catch (actErr) {
          console.error("[SocketService] Error handling agent:activity-change:", actErr);
        }
      });

      // Handle desktop agent disconnect
      socket.on("disconnect", () => {
        console.log(`[SocketService] Desktop agent disconnected for employee: ${canonicalEmpId}`);
        connectedAgents.delete(canonicalEmpId);

        // Notify web clients that agent disconnected, but entered 5-minute grace window
        broadcastToEmployee(canonicalEmpId, "agent:connection-change", {
          isAgentConnected: false,
          inGracePeriod: true,
          graceMinutesRemaining: 5,
        });

        // Start server-side 5-minute grace countdown
        const timer = setTimeout(() => {
          disconnectGraceTimers.delete(canonicalEmpId);
          markAttendanceInactiveDueToDisconnect(canonicalEmpId);
        }, 5 * 60 * 1000); // 5 minutes

        disconnectGraceTimers.set(canonicalEmpId, timer);
      });
    }

    // Handle Web Client connection
    if (clientType === "web" && canonicalEmpId) {
      socket.join(`emp_${canonicalEmpId}`);
      console.log(`[SocketService] Web client joined room: emp_${canonicalEmpId}`);
    }

    // Allow joining specific employee room
    socket.on("join:employee", async (reqEmpId, ack) => {
      if (reqEmpId) {
        socket.join(`emp_${reqEmpId}`);
        try {
          const emp = await resolveEmployee(reqEmpId);
          if (emp) {
            if (emp.employeeId) socket.join(`emp_${emp.employeeId}`);
            if (emp._id) socket.join(`emp_${emp._id.toString()}`);
          }
        } catch (err) {}
        console.log(`[SocketService] Socket ${socket.id} joined room for employee: ${reqEmpId}`);
        if (typeof ack === "function") ack({ success: true });
      }
    });
  });

  return io;
};

/**
 * Get Socket.io Server instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initSocketServer first.");
  }
  return io;
};

/**
 * Check if Desktop Agent is actively connected via socket
 */
export const isAgentConnected = (employeeId) => {
  if (!employeeId) return false;
  const key = normalizeEmployeeKey(employeeId);
  return connectedAgents.has(key);
};
export { isAgentConnected as isSocketAgentConnected };

/**
 * Check if employee is currently within the 5-minute disconnection grace window
 */
export const isEmployeeInGracePeriod = (employeeId) => {
  if (!employeeId) return false;
  const key = normalizeEmployeeKey(employeeId);
  return disconnectGraceTimers.has(key);
};

/**
 * Broadcast event to employee's room (Web + Agent)
 */
export const broadcastToEmployee = async (employeeId, event, data) => {
  if (!io || !employeeId) return;
  const key = normalizeEmployeeKey(employeeId);
  io.to(`emp_${key}`).emit(event, data);

  try {
    const emp = await resolveEmployee(employeeId);
    if (emp) {
      if (emp.employeeId && emp.employeeId !== key) {
        io.to(`emp_${emp.employeeId}`).emit(event, data);
      }
      if (emp._id && emp._id.toString() !== key) {
        io.to(`emp_${emp._id.toString()}`).emit(event, data);
      }
    }
  } catch (err) {}
};

/**
 * Broadcast live attendance update to employee
 */
export const broadcastAttendanceUpdate = (employeeId, attendanceData) => {
  broadcastToEmployee(employeeId, "attendance:update", attendanceData);
};

/**
 * Notify pairing modal on web that agent has successfully paired
 */
export const notifyAgentPaired = (employeeId, details) => {
  broadcastToEmployee(employeeId, "agent:paired", details);
};
