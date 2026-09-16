import Attendance from "../models/attendanceModel.js";
import Employee from "../models/employeeModel.js";
import AgentSession from "../models/agentSessionModel.js";
import IpWhitelist from "../models/ipWhitelistModel.js";
import EmployeeLocation from "../models/employeeLocationModel.js";
import WfhRequest from "../models/wfhRequestModel.js";
import AttendanceSecurityAudit from "../models/attendanceSecurityAuditModel.js";
import OnDutyRequest from "../models/onDutyRequestModel.js";
import AttendanceException from "../models/attendanceExceptionModel.js";
import PayrollPeriod from "../models/payrollPeriodModel.js";
import AttendancePolicy from "../models/attendancePolicyModel.js";
import {
  getClientIp,
  validateAttendanceAccess,
  logSecurityAudit,
} from "../services/attendanceSecurityService.js";
import {
  broadcastAttendanceUpdate,
  isAgentConnected as isSocketAgentConnected,
  isEmployeeInGracePeriod,
} from "../services/socketService.js";

/**
 * Helper to get current YYYY-MM-DD string
 */
const getTodayDateString = (dateObj = new Date()) => {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Helper to find active agent session by any employee identifier
 */
export const findEmployeeAgentSession = async (employeeUser) => {
  if (!employeeUser) return null;
  const ids = [
    employeeUser._id?.toString(),
    employeeUser.employeeId,
    employeeUser.companyEmail,
    employeeUser.personalEmail,
    employeeUser.email,
  ].filter(Boolean);

  let session = await AgentSession.findOne({
    employeeId: { $in: ids },
  }).sort({ lastHeartbeatAt: -1 }).lean();

  if (!session && employeeUser._id) {
    const todayStr = getTodayDateString();
    const att = await Attendance.findOne({ employee: employeeUser._id, date: todayStr }).select("deviceId").lean();
    if (att?.deviceId) {
      session = await AgentSession.findOne({ deviceId: att.deviceId }).sort({ lastHeartbeatAt: -1 }).lean();
    }
  }

  return session;
};

/**
 * Helper to evaluate agent connection & 5-minute disconnect grace period
 */
export const evaluateAgentSessionStatus = (agentSession) => {
  if (!agentSession || !agentSession.isPaired) {
    return {
      isAgentConnected: false,
      isAgentIdle: true,
      inGracePeriod: false,
      disconnectMinutes: 999,
      isDisconnectedOver5Mins: true,
    };
  }

  const now = Date.now();
  const lastHbTime = agentSession.lastHeartbeatAt ? new Date(agentSession.lastHeartbeatAt).getTime() : 0;
  // Consider heartbeat alive if received within last 90 seconds (heartbeats sent every 5-30s + network jitter)
  const isHeartbeatFresh = (now - lastHbTime) < 90000;
  const isExplicitOffline = agentSession.currentStatus === "Offline" || agentSession.currentStatus === "Disconnected";

  // Check live Socket.io presence
  const isSocketLive = agentSession.employeeId ? isSocketAgentConnected(agentSession.employeeId) : false;
  const inSocketGrace = agentSession.employeeId ? isEmployeeInGracePeriod(agentSession.employeeId) : false;

  // Agent is actively connected if socket is live OR heartbeat is fresh and agent is not offline
  const isAgentConnected = isSocketLive || (isHeartbeatFresh && !isExplicitOffline);

  // Determine when agent disconnected
  let disconnectElapsedMs = 0;
  if (!isAgentConnected) {
    const disconnectStartTime = agentSession.disconnectedAt
      ? new Date(agentSession.disconnectedAt).getTime()
      : lastHbTime;
    disconnectElapsedMs = Math.max(0, now - disconnectStartTime);
  }

  const disconnectMinutes = Math.round(disconnectElapsedMs / 60000);
  // 5-minute (300,000 ms) reconnection grace window
  const inGracePeriod = !isAgentConnected && (inSocketGrace || disconnectElapsedMs <= 300000);
  const isDisconnectedOver5Mins = !isAgentConnected && !inSocketGrace && (disconnectElapsedMs > 300000);

  // Marked idle if:
  // 1. Idle time on desktop >= 15 mins (900s) OR explicit idle status from desktop idle detector
  // 2. OR agent has been closed / disconnected for MORE than 5 minutes (300,000 ms)
  const isAgentIdle =
    (typeof agentSession.idleTimeSeconds === "number" && agentSession.idleTimeSeconds >= 900) ||
    (agentSession.currentStatus === "Idle") ||
    isDisconnectedOver5Mins;

  return {
    isAgentConnected,
    isAgentIdle,
    inGracePeriod,
    disconnectMinutes,
    isDisconnectedOver5Mins,
  };
};

/**
 * @desc    Employee Check-In
 * @route   POST /api/attendance/check-in
 * @access  Private (Employee / Admin)
 */
export const checkIn = async (req, res) => {
  try {
    const employeeId = req.user?.role === "Admin" && req.body.employeeId ? req.body.employeeId : req.user?._id;
    const { isRemote, deviceId, deviceName } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    let employee = await Employee.findById(employeeId);
    if (!employee && req.user?.email) {
      employee = await Employee.findOne({ companyEmail: req.user.email }) || await Employee.findOne({ email: req.user.email });
    }
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Check desktop agent connection status and block check-in if agent is disconnected
    let isAgentConnected = false;
    if (req.user?.role === "Employee") {
      const agentSession = await findEmployeeAgentSession(employee);

      const evalStatus = evaluateAgentSessionStatus(agentSession);
      isAgentConnected = evalStatus.isAgentConnected;

      if (!isAgentConnected && !evalStatus.inGracePeriod) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: Desktop Tracker Agent is disconnected. You must have the desktop tracker agent running and connected to your account to check in.",
          agentDisconnected: true,
        });
      }
    }

    // ── Attendance Security Validation (IP & Geolocation Whitelist) ──
    const clientIp = getClientIp(req);
    const { latitude, longitude, accuracy } = req.body;
    const accessCheck = await validateAttendanceAccess(employee._id, {
      ip: clientIp,
      latitude,
      longitude,
      accuracy,
    });

    if (!accessCheck.allowed) {
      const failedChecksStr = accessCheck.failedChecks ? accessCheck.failedChecks.join(" & ") : accessCheck.reason;
      await logSecurityAudit({
        action: "CHECKIN_BLOCKED",
        performedBy: req.user?._id,
        employee: employee._id,
        ip: clientIp,
        location: accessCheck.location || "Unknown Location",
        reason: `${employee.fullName} (${employee.employeeId || "Staff"}) attempted check-in from unauthorized IP (${clientIp}) or Location (${accessCheck.location}). Blocked: ${failedChecksStr}`,
        metadata: {
          employeeName: employee.fullName,
          employeeId: employee.employeeId,
          attemptedIp: clientIp,
          attemptedLatitude: latitude || null,
          attemptedLongitude: longitude || null,
          attemptedLocation: accessCheck.location,
          failedChecks: accessCheck.failedChecks || [],
          failureReason: accessCheck.reason,
          details: accessCheck.message,
        },
      });

      return res.status(403).json({
        success: false,
        message: accessCheck.message,
        validation: accessCheck,
      });
    }

    await logSecurityAudit({
      action: "CHECKIN_ALLOWED",
      performedBy: req.user?._id,
      employee: employee._id,
      ip: clientIp,
      location: accessCheck.location,
      reason: accessCheck.reason,
      matchedRule: accessCheck.matchedRule,
    });

    const todayStr = getTodayDateString();
    let attendance = await Attendance.findOne({ employee: employee._id, date: todayStr });

    if (attendance && attendance.checkInTime) {
      return res.status(400).json({
        success: false,
        message: "Already checked in today",
        attendance,
      });
    }

    const now = new Date();
    // Retrieve shift start time & grace minutes from attendance policy
    const policy = await AttendancePolicy.findOne({ companyId: "default_company" });
    const defaultShift = policy?.shifts?.find((s) => s.isDefault && s.isActive) || policy?.shifts?.[0] || {
      startTime: "09:30",
      graceMinutes: 15,
      gracePeriodMinutes: 15,
      name: "General Shift (09:30 AM - 06:30 PM)",
    };

    const startTimeParts = (defaultShift.startTime || "09:30").split(":");
    const shiftStartHour = parseInt(startTimeParts[0], 10) || 9;
    const shiftStartMin = parseInt(startTimeParts[1], 10) || 30;
    const graceMin = defaultShift.graceMinutes || defaultShift.gracePeriodMinutes || policy?.lateGraceMinutes || 15;

    const shiftStartTotalMin = shiftStartHour * 60 + shiftStartMin;
    const checkInTotalMin = now.getHours() * 60 + now.getMinutes();

    let isLate = false;
    let lateMinutes = 0;
    if (checkInTotalMin > shiftStartTotalMin + graceMin) {
      isLate = true;
      lateMinutes = checkInTotalMin - shiftStartTotalMin;
    }
    const attendanceStatus = isLate ? "Late Check-In" : "Present";

    const initialTimeline = [
      {
        eventType: "Checked In",
        timestamp: now,
        description: `Checked in successfully${isRemote ? " (Remote)" : ""}${isLate ? ` (${lateMinutes} mins late)` : ""}`,
        source: req.body.source || "Web App",
      },
    ];

    if (attendance) {
      attendance.checkInTime = now;
      attendance.currentStatus = "Working";
      attendance.attendanceStatus = attendanceStatus;
      attendance.isLate = isLate;
      attendance.lateMinutes = lateMinutes;
      attendance.shift = defaultShift.name || "General Shift (09:30 AM - 06:30 PM)";
      attendance.isRemote = !!isRemote;
      attendance.deviceId = deviceId || attendance.deviceId;
      attendance.deviceName = deviceName || attendance.deviceName;
      attendance.lastActivityAt = now;
      attendance.timeline.push(...initialTimeline);
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        employee: employee._id,
        employeeCustomId: employee.employeeId || employee._id.toString(),
        date: todayStr,
        checkInTime: now,
        currentStatus: "Working",
        attendanceStatus,
        isLate,
        lateMinutes,
        shift: defaultShift.name || "General Shift (09:30 AM - 06:30 PM)",
        isRemote: !!isRemote,
        deviceId: deviceId || null,
        deviceName: deviceName || null,
        lastActivityAt: now,
      });
    }

    try {
      broadcastAttendanceUpdate(employee.employeeId || employee._id.toString(), {
        currentStatus: attendance.currentStatus,
        attendance,
        isAgentConnected: true,
      });
    } catch (sockErr) {
      console.error("Error broadcasting checkIn:", sockErr);
    }

    return res.status(200).json({
      success: true,
      message: "Checked in successfully",
      attendance,
    });
  } catch (error) {
    console.error("Error in checkIn:", error);
    return res.status(500).json({ success: false, message: "Server error during check-in", error: error.message });
  }
};

/**
 * @desc    Start Break
 * @route   POST /api/attendance/start-break
 * @access  Private
 */
export const startBreak = async (req, res) => {
  try {
    const employeeId = req.user?.role === "Admin" && req.body.employeeId ? req.body.employeeId : req.user?._id;
    const { breakReason } = req.body;
    const todayStr = getTodayDateString();

    const attendance = await Attendance.findOne({ employee: employeeId, date: todayStr });
    if (!attendance || !attendance.checkInTime) {
      return res.status(400).json({ success: false, message: "Must check in before taking a break" });
    }

    if (attendance.currentStatus === "Checked Out") {
      return res.status(400).json({ success: false, message: "Cannot take break after checking out" });
    }

    if (attendance.currentStatus === "On Break") {
      return res.status(400).json({ success: false, message: "Already on break" });
    }

    const now = new Date();
    attendance.breaks.push({
      startTime: now,
      breakReason: breakReason || "General Break",
    });
    attendance.currentStatus = "On Break";
    attendance.timeline.push({
      eventType: "Break Started",
      timestamp: now,
      description: `Break started: ${breakReason || "General Break"}`,
      source: req.body.source || "Web App",
    });

    await attendance.save();

    // Immediately signal desktop agent session to On Break
    try {
      await AgentSession.updateMany(
        {
          $or: [
            { employeeId: employeeId?.toString() },
            { employeeId: attendance.employeeCustomId },
          ].filter(Boolean),
        },
        {
          $set: {
            currentStatus: "On Break",
            lastHeartbeatAt: now,
          },
        }
      );
    } catch (agentErr) {
      console.error("Error updating agent session on startBreak:", agentErr);
    }

    // Instantly push On Break status to Web and Desktop Agent sockets
    try {
      broadcastAttendanceUpdate(employeeId?.toString() || attendance.employeeCustomId, {
        currentStatus: "On Break",
        attendance,
      });
    } catch (sockErr) {
      console.error("Error broadcasting startBreak:", sockErr);
    }

    return res.status(200).json({
      success: true,
      message: "Break started",
      attendance,
    });
  } catch (error) {
    console.error("Error in startBreak:", error);
    return res.status(500).json({ success: false, message: "Failed to start break", error: error.message });
  }
};

/**
 * @desc    End Break
 * @route   POST /api/attendance/end-break
 * @access  Private
 */
export const endBreak = async (req, res) => {
  try {
    const employeeId = req.user?.role === "Admin" && req.body.employeeId ? req.body.employeeId : req.user?._id;
    const todayStr = getTodayDateString();

    const attendance = await Attendance.findOne({ employee: employeeId, date: todayStr });
    if (!attendance || attendance.currentStatus !== "On Break") {
      return res.status(400).json({ success: false, message: "No active break found to end" });
    }

    const now = new Date();
    const openBreak = attendance.breaks.find((b) => !b.endTime);

    if (openBreak) {
      openBreak.endTime = now;
      const durationMs = now.getTime() - new Date(openBreak.startTime).getTime();
      openBreak.durationMinutes = Math.round(durationMs / 60000);
    }

    // Recalculate total break minutes
    let totalBreakMs = 0;
    attendance.breaks.forEach((b) => {
      if (b.startTime && b.endTime) {
        totalBreakMs += new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
      }
    });
    attendance.totalBreakMinutes = Math.round(totalBreakMs / 60000);
    attendance.currentStatus = "Working";
    attendance.lastActivityAt = now;

    attendance.timeline.push({
      eventType: "Break Ended",
      timestamp: now,
      description: "Resumed work from break",
      source: req.body.source || "Web App",
    });

    await attendance.save();

    // Immediately signal desktop agent session to Active
    try {
      await AgentSession.updateMany(
        {
          $or: [
            { employeeId: employeeId?.toString() },
            { employeeId: attendance.employeeCustomId },
          ].filter(Boolean),
        },
        {
          $set: {
            currentStatus: "Active",
            lastHeartbeatAt: now,
          },
        }
      );
    } catch (agentErr) {
      console.error("Error updating agent session on endBreak:", agentErr);
    }

    // Instantly push Active/Working status to Web and Desktop Agent sockets
    try {
      broadcastAttendanceUpdate(employeeId?.toString() || attendance.employeeCustomId, {
        currentStatus: "Working",
        attendance,
      });
    } catch (sockErr) {
      console.error("Error broadcasting endBreak:", sockErr);
    }

    return res.status(200).json({
      success: true,
      message: "Break ended",
      attendance,
    });
  } catch (error) {
    console.error("Error in endBreak:", error);
    return res.status(500).json({ success: false, message: "Failed to end break", error: error.message });
  }
};

/**
 * @desc    Check-Out
 * @route   POST /api/attendance/check-out
 * @access  Private
 */
export const checkOut = async (req, res) => {
  try {
    const employeeId = req.user?.role === "Admin" && req.body.employeeId ? req.body.employeeId : req.user?._id;
    const todayStr = getTodayDateString();

    const attendance = await Attendance.findOne({ employee: employeeId, date: todayStr });
    if (!attendance || !attendance.checkInTime) {
      return res.status(400).json({ success: false, message: "Cannot check out without checking in first" });
    }

    if (attendance.currentStatus === "Checked Out") {
      return res.status(400).json({ success: false, message: "Already checked out" });
    }

    const now = new Date();

    // Close any open break if active
    if (attendance.currentStatus === "On Break") {
      const openBreak = attendance.breaks.find((b) => !b.endTime);
      if (openBreak) {
        openBreak.endTime = now;
        openBreak.durationMinutes = Math.round((now.getTime() - new Date(openBreak.startTime).getTime()) / 60000);
      }
    }

    // Recalculate break minutes
    let totalBreakMs = 0;
    attendance.breaks.forEach((b) => {
      if (b.startTime && b.endTime) {
        totalBreakMs += new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
      }
    });
    attendance.totalBreakMinutes = Math.round(totalBreakMs / 60000);

    // Calculate total working minutes (CheckOut - CheckIn - BreakMinutes)
    const totalElapsedMs = now.getTime() - new Date(attendance.checkInTime).getTime();
    const elapsedMinutes = Math.max(0, Math.round(totalElapsedMs / 60000));
    attendance.totalWorkingMinutes = Math.max(0, elapsedMinutes - attendance.totalBreakMinutes);

    attendance.checkOutTime = now;
    attendance.currentStatus = "Checked Out";
    attendance.lastActivityAt = now;

    attendance.timeline.push({
      eventType: "Checked Out",
      timestamp: now,
      description: `Checked out. Total working duration: ${(attendance.totalWorkingMinutes / 60).toFixed(1)} hrs`,
      source: req.body.source || "Web App",
    });

    await attendance.save();

    // Broadcast Checked Out to Web and Desktop Agent sockets
    try {
      broadcastAttendanceUpdate(attendance.employee?.toString() || attendance.employeeCustomId, {
        currentStatus: "Checked Out",
        attendance,
      });
    } catch (sockErr) {
      console.error("Error broadcasting checkOut:", sockErr);
    }

    return res.status(200).json({
      success: true,
      message: "Checked out successfully",
      attendance,
    });
  } catch (error) {
    console.error("Error in checkOut:", error);
    return res.status(500).json({ success: false, message: "Failed to check out", error: error.message });
  }
};

/**
 * @desc    Get Attendance Dashboard Summary
 * @route   GET /api/attendance/summary
 * @access  Private
 */
const autoCheckStaleAgentSessions = async (todayStr) => {
  try {
    const fiveMinsAgo = new Date(Date.now() - 300000);
    const staleRecords = await Attendance.find({
      date: todayStr,
      currentStatus: "Working",
      deviceId: { $exists: true, $ne: null },
      lastActivityAt: { $exists: true, $ne: null, $lt: fiveMinsAgo },
    });

    for (const record of staleRecords) {
      const agentSession = await AgentSession.findOne({
        deviceId: record.deviceId,
      }).sort({ lastHeartbeatAt: -1 });

      const { isAgentIdle, isDisconnectedOver5Mins } = evaluateAgentSessionStatus(agentSession);
      if (isAgentIdle || isDisconnectedOver5Mins) {
        record.currentStatus = "Inactive";
        record.timeline.push({
          eventType: "Became Inactive",
          timestamp: new Date(),
          description: isDisconnectedOver5Mins
            ? "Desktop agent disconnected for over 5 minutes"
            : "No activity detected from desktop agent for 15+ minutes",
          source: "Desktop Agent",
        });
        await record.save();

        if (record.employee) {
          try {
            broadcastAttendanceUpdate(record.employee.toString(), {
              currentStatus: "Inactive",
              attendance: record,
              isAgentConnected: false,
              inGracePeriod: false,
            });
          } catch (sockErr) {
            console.error("Error broadcasting in autoCheckStaleAgentSessions:", sockErr);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error checking stale agent sessions:", err);
  }
};

// Start background timer to autonomously check stale agent sessions every 60s
let staleInterval = null;
export const startStaleSessionChecker = () => {
  if (staleInterval) clearInterval(staleInterval);
  staleInterval = setInterval(() => {
    autoCheckStaleAgentSessions(getTodayDateString());
  }, 60000);
};
startStaleSessionChecker();

/**
 * @desc    Get Current Logged-in Employee's Attendance Session (Fast Polling Endpoint)
 * @route   GET /api/attendance/my-session
 * @access  Private
 */
export const getMyAttendanceSession = async (req, res) => {
  try {
    const todayStr = getTodayDateString();
    const queryDate = req.query.date || todayStr;
    const attendance = await Attendance.findOne({ employee: req.user._id, date: queryDate }).populate("employee", "fullName name companyEmail email department employeeId role");

    // Fetch desktop agent pairing session for connection status
    const agentSession = await findEmployeeAgentSession(req.user);
    
    const {
      isAgentConnected,
      isAgentIdle,
      inGracePeriod,
      disconnectMinutes,
      isDisconnectedOver5Mins,
    } = evaluateAgentSessionStatus(agentSession);

    if (attendance && attendance.currentStatus !== "Checked Out" && attendance.currentStatus !== "On Break") {
      if (isAgentIdle && attendance.currentStatus !== "Inactive" && attendance.currentStatus !== "Idle") {
        attendance.currentStatus = "Inactive";
        attendance.timeline.push({
          eventType: "Became Inactive",
          timestamp: new Date(),
          description: isDisconnectedOver5Mins
            ? `Desktop agent disconnected for over 5 minutes (${disconnectMinutes}m)`
            : `No activity detected for 15+ minutes (${Math.round((agentSession?.idleTimeSeconds || 900) / 60)}m idle)`,
          source: "Desktop Agent",
        });
        await attendance.save();
      } else if ((isAgentConnected || inGracePeriod) && !isAgentIdle && attendance.currentStatus !== "Working") {
        if (attendance.currentStatus === "Idle" || attendance.currentStatus === "Inactive") {
          const elapsedMins = (Date.now() - new Date(attendance.lastActivityAt || Date.now()).getTime()) / 60000;
          attendance.totalIdleMinutes = (attendance.totalIdleMinutes || 0) + elapsedMins;
        }
        attendance.currentStatus = "Working";
        attendance.lastActivityAt = new Date();
        attendance.timeline.push({
          eventType: "Became Active",
          timestamp: new Date(),
          description: "User resumed active desktop work (Auto-Sync)",
          source: "Desktop Agent",
        });
        await attendance.save();
      }
    }
    const agentDeviceName = agentSession ? agentSession.computerName : null;

    return res.status(200).json({
      success: true,
      currentStatus: attendance?.currentStatus || "Not Checked In",
      attendance,
      isAgentConnected,
      inGracePeriod,
      disconnectMinutes,
      agentDeviceName,
    });
  } catch (error) {
    console.error("Error in getMyAttendanceSession:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch session", error: error.message });
  }
};

export const syncAgentActivity = async ({ deviceId, employeeCustomId, status, idleTimeSeconds, computerName }) => {
  try {
    const todayStr = getTodayDateString();

    let employee = null;
    if (employeeCustomId && employeeCustomId !== "EMP-DEFAULT") {
      const mongoose = await import("mongoose");
      const isObjectId = mongoose.default.Types.ObjectId.isValid(employeeCustomId);
      employee = await Employee.findOne({
        $or: [
          { employeeId: employeeCustomId },
          ...(isObjectId ? [{ _id: employeeCustomId }] : []),
          { companyEmail: employeeCustomId },
          { personalEmail: employeeCustomId },
          { email: employeeCustomId },
        ],
      });
    }

    if (!employee && deviceId) {
      const agentSession = await AgentSession.findOne({ deviceId });
      if (agentSession?.employeeId && agentSession.employeeId !== "EMP-DEFAULT") {
        const mongoose = await import("mongoose");
        const isObjectId = mongoose.default.Types.ObjectId.isValid(agentSession.employeeId);
        employee = await Employee.findOne({
          $or: [
            { employeeId: agentSession.employeeId },
            ...(isObjectId ? [{ _id: agentSession.employeeId }] : []),
            { companyEmail: agentSession.employeeId },
            { personalEmail: agentSession.employeeId },
            { email: agentSession.employeeId },
          ],
        });
      }
      if (!employee) {
        const att = await Attendance.findOne({ deviceId, date: todayStr });
        if (att?.employee) {
          employee = await Employee.findById(att.employee);
        }
      }

      if (!employee) {
        const activeAtt = await Attendance.findOne({ date: todayStr, currentStatus: { $ne: "Checked Out" } }).sort({ checkInTime: -1 });
        if (activeAtt?.employee) {
          employee = await Employee.findById(activeAtt.employee);
          if (employee) {
            activeAtt.deviceId = deviceId;
            activeAtt.deviceName = computerName;
            await activeAtt.save();
          }
        }
      }
    }

    if (!employee) return { serverStatus: "Not Checked In", notCheckedIn: true };

    let attendance = await Attendance.findOne({ employee: employee._id, date: todayStr });
    if (!attendance || !attendance.checkInTime) {
      return { serverStatus: "Not Checked In", notCheckedIn: true };
    }

    if (attendance.currentStatus === "Checked Out") {
      return { serverStatus: "Checked Out", checkedOut: true };
    }

    const oldStatus = attendance.currentStatus;
    const oldLastActivityAt = attendance.lastActivityAt || new Date();

    // 1. Calculate incremental idle time when agent is reporting
    const prevIdleSeconds = attendance.systemIdleSeconds || 0;
    if (idleTimeSeconds > prevIdleSeconds) {
      const incrementalIdleMins = (idleTimeSeconds - prevIdleSeconds) / 60;
      attendance.totalIdleMinutes = (attendance.totalIdleMinutes || 0) + incrementalIdleMins;
    }

    attendance.deviceId = deviceId;
    attendance.deviceName = computerName;
    attendance.systemIdleSeconds = idleTimeSeconds;
    attendance.lastActivityAt = new Date();

    // 2. Breaks are managed exclusively from the website
    if (oldStatus === "On Break") {
      // While on break on website, enforce On Break status to the desktop agent
      return { serverStatus: "On Break" };
    }

    const isExplicitIdle = status === "Idle" || (typeof idleTimeSeconds === "number" && idleTimeSeconds >= 900);
    const isExplicitOffline = status === "Offline" || status === "Disconnected";

    if (isExplicitIdle) {
      if (oldStatus !== "Inactive" && oldStatus !== "Idle") {
        attendance.currentStatus = "Inactive";
        const initialIdleMins = Math.round((idleTimeSeconds || 900) / 60);
        attendance.timeline.push({
          eventType: "Became Inactive",
          timestamp: new Date(),
          description: `No mouse movement / activity detected for 15+ minutes (${initialIdleMins}m idle)`,
          source: "Desktop Agent",
        });
      } else {
        attendance.currentStatus = "Inactive";
      }
    } else if (isExplicitOffline) {
      // 5-minute grace window applies before marking inactive. Stale session checker & session poller will transition after 5 mins.
    } else {
      // Reconnected / active desktop work
      if (oldStatus !== "Working") {
        if (oldStatus === "Idle" || oldStatus === "Inactive") {
          const elapsedMins = (Date.now() - new Date(oldLastActivityAt).getTime()) / 60000;
          attendance.totalIdleMinutes = (attendance.totalIdleMinutes || 0) + elapsedMins;
        }
        attendance.timeline.push({
          eventType: "Became Active",
          timestamp: new Date(),
          description: "User resumed active desktop work (Auto-Sync)",
          source: "Desktop Agent",
        });
      }
      attendance.currentStatus = "Working";
    }

    // Calculate longest idle minutes
    const currentIdleMins = Math.round((idleTimeSeconds || 0) / 60);
    if (currentIdleMins > (attendance.longestIdleMinutes || 0)) {
      attendance.longestIdleMinutes = currentIdleMins;
    }

    // Ensure totalIdleMinutes is at least longestIdleMinutes
    if ((attendance.totalIdleMinutes || 0) < (attendance.longestIdleMinutes || 0)) {
      attendance.totalIdleMinutes = attendance.longestIdleMinutes;
    }

    // Calculate activityScore dynamically (percentage of active time over total working time)
    let totalWorkingMins = attendance.totalWorkingMinutes || 0;
    if (attendance.checkInTime && !attendance.checkOutTime) {
      const elapsedMins = Math.round((Date.now() - new Date(attendance.checkInTime).getTime()) / 60000);
      totalWorkingMins = Math.max(0, elapsedMins - (attendance.totalBreakMinutes || 0));
    }
    
    if (totalWorkingMins > 0) {
      const activeMins = Math.max(0, totalWorkingMins - (attendance.totalIdleMinutes || 0));
      attendance.activityScore = Math.max(0, Math.min(100, Math.round((activeMins / totalWorkingMins) * 100)));
    } else {
      attendance.activityScore = 100;
    }

    await attendance.save();

    try {
      broadcastAttendanceUpdate(employeeCustomId || attendance.employeeCustomId || attendance.employee?.toString(), {
        currentStatus: attendance.currentStatus,
        attendance,
        isAgentConnected: true,
      });
    } catch (sockErr) {
      console.error("Error broadcasting in syncAgentActivity:", sockErr);
    }

    return { serverStatus: attendance.currentStatus };
  } catch (err) {
    console.error("Error in syncAgentActivity:", err);
    return { serverStatus: status };
  }
};

export const getTodaySummary = async (req, res) => {
  try {
    const todayStr = getTodayDateString();
    const userId = req.user?._id;

    // MANDATORY RBAC DATA ISOLATION (ProjectRules.md)
    if (req.user?.role === "Employee") {
      const targetDate = req.query.date || todayStr;
      const myRecord = await Attendance.findOne({ employee: userId, date: targetDate });
      
      // Fetch desktop agent pairing session for connection status
      const agentSession = await findEmployeeAgentSession(req.user);
      const {
        isAgentConnected,
        isAgentIdle,
        inGracePeriod,
        disconnectMinutes,
        isDisconnectedOver5Mins,
      } = evaluateAgentSessionStatus(agentSession);

      if (myRecord && myRecord.currentStatus !== "Checked Out" && myRecord.currentStatus !== "On Break") {
        if (isAgentIdle && myRecord.currentStatus !== "Inactive" && myRecord.currentStatus !== "Idle") {
          myRecord.currentStatus = "Inactive";
          myRecord.timeline.push({
            eventType: "Became Inactive",
            timestamp: new Date(),
            description: isDisconnectedOver5Mins
              ? `Desktop agent disconnected for over 5 minutes (${disconnectMinutes}m)`
              : `No activity detected for 15+ minutes (${Math.round((agentSession?.idleTimeSeconds || 900) / 60)}m idle)`,
            source: "Desktop Agent",
          });
          await myRecord.save();
        } else if ((isAgentConnected || inGracePeriod) && !isAgentIdle && myRecord.currentStatus !== "Working") {
          if (myRecord.currentStatus === "Idle" || myRecord.currentStatus === "Inactive") {
            const elapsedMins = (Date.now() - new Date(myRecord.lastActivityAt || Date.now()).getTime()) / 60000;
            myRecord.totalIdleMinutes = (myRecord.totalIdleMinutes || 0) + elapsedMins;
          }
          myRecord.currentStatus = "Working";
          myRecord.lastActivityAt = new Date();
          myRecord.timeline.push({
            eventType: "Became Active",
            timestamp: new Date(),
            description: "User resumed active desktop work (Auto-Sync)",
            source: "Desktop Agent",
          });
          await myRecord.save();
        }
      }

      const startOfMonth = new Date(targetDate);
      startOfMonth.setDate(1);
      const startOfMonthStr = getTodayDateString(startOfMonth);

      const monthRecords = await Attendance.find({
        employee: userId,
        date: { $gte: startOfMonthStr, $lte: targetDate },
      }).select("totalWorkingMinutes attendanceStatus").lean();

      let totalMonthMins = 0;
      let lateCheckInsMonth = 0;

      monthRecords.forEach((m) => {
        totalMonthMins += m.totalWorkingMinutes || 0;
        if (m.attendanceStatus === "Late Check-In") lateCheckInsMonth++;
      });

      let currentWorkMins = myRecord?.totalWorkingMinutes || 0;
      if (myRecord?.checkInTime && !myRecord?.checkOutTime && myRecord?.currentStatus !== "On Break") {
        const elapsedMins = Math.round((Date.now() - new Date(myRecord.checkInTime).getTime()) / 60000);
        currentWorkMins = Math.max(0, elapsedMins - (myRecord.totalBreakMinutes || 0));
      }

      // Calculate week dates (Monday to Sunday) containing targetDate
      const target = new Date(targetDate);
      const dayOfWeek = target.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const diffToMon = target.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(target.setDate(diffToMon));

      const weekDates = [];
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      for (let i = 0; i < 7; i++) {
        const nextDay = new Date(monday);
        nextDay.setDate(monday.getDate() + i);
        weekDates.push(getTodayDateString(nextDay));
      }

      const weekRecords = await Attendance.find({
        employee: userId,
        date: { $in: weekDates },
      }).select("date totalWorkingMinutes checkInTime checkOutTime currentStatus totalBreakMinutes").lean();

      const recordsByDate = {};
      weekRecords.forEach((r) => {
        recordsByDate[r.date] = r;
      });

      const weekTrend = dayNames.map((name, index) => {
        const dateStr = weekDates[index];
        const record = recordsByDate[dateStr];
        let workingMinutes = record?.totalWorkingMinutes || 0;

        // If today is in the week trend and we are currently working, calculate live elapsed working minutes
        if (dateStr === todayStr && record && record.checkInTime && !record.checkOutTime && record.currentStatus !== "On Break") {
          const elapsedMins = Math.round((Date.now() - new Date(record.checkInTime).getTime()) / 60000);
          workingMinutes = Math.max(0, elapsedMins - (record.totalBreakMinutes || 0));
        }

        const hrs = Math.floor(workingMinutes / 60);
        const mins = workingMinutes % 60;
        const label = workingMinutes > 0 ? `${hrs}h ${String(mins).padStart(2, "0")}m` : "";
        const decimalHours = parseFloat((workingMinutes / 60).toFixed(2));

        return {
          day: name,
          date: dateStr,
          workingMinutes,
          hours: decimalHours,
          label,
        };
      });

      return res.status(200).json({
        success: true,
        isEmployeeView: true,
        summary: {
          myStatus: myRecord?.currentStatus || "Not Checked In",
          myAttendanceStatus: myRecord?.attendanceStatus || "Absent",
          myCheckInTime: myRecord?.checkInTime || null,
          myCheckOutTime: myRecord?.checkOutTime || null,
          myWorkingHoursToday: (currentWorkMins / 60).toFixed(1),
          myWorkingMinutesToday: currentWorkMins,
          myBreakMinutesToday: myRecord?.totalBreakMinutes || 0,
          myMonthlyHours: (totalMonthMins / 60).toFixed(1),
          myLateCheckIns: lateCheckInsMonth,
          longestIdleMinutes: myRecord?.longestIdleMinutes || 0,
          activityScore: myRecord?.activityScore !== undefined ? myRecord.activityScore : 100,
          notes: myRecord?.notes || "",
          totalIdleMinutes: Math.round(myRecord?.totalIdleMinutes || 0),
          breaks: myRecord?.breaks || [],
          timeline: myRecord?.timeline || [],
        },
        trends: {
          todayCount: myRecord?.checkInTime ? 1 : 0,
          weekCount: monthRecords.length,
          monthCount: monthRecords.length,
          weekTrend,
        },
      });
    }

    // Admin View - Company Wide Summary
    const totalEmployeesCount = await Employee.countDocuments();
    const todayRecords = await Attendance.find({ date: todayStr }).populate("employee", "name email department employeeId role");

    let presentToday = 0;
    let absentToday = 0;
    let onBreakToday = 0;
    let remoteToday = 0;
    let checkedInToday = 0;
    let checkedOutToday = 0;
    let totalWorkingMinutesSum = 0;
    let workingEmployeesCount = 0;

    todayRecords.forEach((r) => {
      if (r.checkInTime) {
        presentToday++;
        checkedInToday++;
      }
      if (r.checkOutTime) {
        checkedOutToday++;
      }
      if (r.currentStatus === "On Break") {
        onBreakToday++;
      }
      if (r.isRemote) {
        remoteToday++;
      }

      // Calculate working minutes so far
      let currentWorkMins = r.totalWorkingMinutes || 0;
      if (r.checkInTime && !r.checkOutTime && r.currentStatus !== "On Break") {
        const nowMs = Date.now();
        const elapsedMins = Math.round((nowMs - new Date(r.checkInTime).getTime()) / 60000);
        currentWorkMins = Math.max(0, elapsedMins - (r.totalBreakMinutes || 0));
      }
      if (currentWorkMins > 0) {
        totalWorkingMinutesSum += currentWorkMins;
        workingEmployeesCount++;
      }
    });

    absentToday = Math.max(0, totalEmployeesCount - presentToday);
    const avgWorkingHoursToday = workingEmployeesCount > 0 ? (totalWorkingMinutesSum / workingEmployeesCount / 60).toFixed(1) : "0.0";

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfWeekStr = getTodayDateString(startOfWeek);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startOfMonthStr = getTodayDateString(startOfMonth);

    const weekCount = await Attendance.countDocuments({ date: { $gte: startOfWeekStr } });
    const monthCount = await Attendance.countDocuments({ date: { $gte: startOfMonthStr } });

    return res.status(200).json({
      success: true,
      isEmployeeView: false,
      summary: {
        totalEmployees: totalEmployeesCount,
        presentToday,
        absentToday,
        onBreakToday,
        remoteToday,
        checkedInToday,
        checkedOutToday,
        avgWorkingHoursToday,
      },
      trends: {
        todayCount: presentToday,
        weekCount,
        monthCount,
      },
    });
  } catch (error) {
    console.error("Error in getTodaySummary:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch attendance summary", error: error.message });
  }
};

/**
 * @desc    Get Attendance List Table with Filters & Pagination
 * @route   GET /api/attendance/list
 * @access  Private
 */
export const getAttendanceList = async (req, res) => {
  try {
    const { search, department, status, date, page = 1, limit = 10 } = req.query;
    const targetDate = date || getTodayDateString();

    const filter = { date: targetDate };

    // MANDATORY RBAC DATABASE FILTERING (ProjectRules.md)
    if (req.user?.role === "Employee") {
      filter.employee = req.user._id;
    } else if (status && status !== "All") {
      filter.currentStatus = status;
    }

    let attendanceRecords = await Attendance.find(filter)
      .populate("employee", "fullName name companyEmail email department employeeId role designation avatar")
      .sort({ updatedAt: -1 });

    // For Admin: Ensure all employees have a record representation. For Employee: ONLY the logged-in employee.
    const allEmployees = req.user?.role === "Employee"
      ? await Employee.find({ _id: req.user._id })
      : await Employee.find();

    const recordsMap = new Map();
    attendanceRecords.forEach((rec) => {
      if (rec.employee) {
        recordsMap.set(rec.employee._id.toString(), rec);
      }
    });

    let combinedList = allEmployees.map((emp) => {
      const existing = recordsMap.get(emp._id.toString());
      if (existing) {
        return existing;
      }
      // Return a virtual "Not Checked In" entry if no record exists yet
      return {
        _id: `virtual-${emp._id}`,
        employee: emp,
        employeeCustomId: emp.employeeId || emp._id.toString(),
        date: targetDate,
        checkInTime: null,
        checkOutTime: null,
        currentStatus: "Not Checked In",
        attendanceStatus: "Absent",
        totalWorkingMinutes: 0,
        totalBreakMinutes: 0,
        totalIdleMinutes: 0,
        lastActivityAt: null,
        timeline: [],
        breaks: [],
      };
    });

    // Client-side search and department filtering
    if (search) {
      const s = search.toLowerCase();
      combinedList = combinedList.filter(
        (item) =>
          item.employee?.name?.toLowerCase().includes(s) ||
          item.employee?.email?.toLowerCase().includes(s) ||
          item.employeeCustomId?.toLowerCase().includes(s)
      );
    }

    if (department && department !== "All") {
      combinedList = combinedList.filter((item) => item.employee?.department === department);
    }

    // MANDATORY RBAC DATA ISOLATION (ProjectRules.md)
    if (req.user?.role === "Employee") {
      combinedList = combinedList.filter(
        (item) => item.employee?._id?.toString() === req.user._id?.toString()
      );
    }

    // Pagination calculation
    const totalRecords = combinedList.length;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedRecords = combinedList.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      records: paginatedRecords,
      pagination: {
        total: totalRecords,
        page: pageNum,
        pages: Math.ceil(totalRecords / limitNum),
      },
    });
  } catch (error) {
    console.error("Error in getAttendanceList:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch attendance list", error: error.message });
  }
};

/**
 * @desc    Get Detailed Attendance Record with Timeline
 * @route   GET /api/attendance/details/:id
 * @access  Private
 */
export const getAttendanceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    let attendance = null;

    if (id.startsWith("virtual-")) {
      const empId = id.replace("virtual-", "");
      const employee = await Employee.findById(empId);
      attendance = {
        _id: id,
        employee,
        employeeCustomId: employee?.employeeId || empId,
        date: getTodayDateString(),
        currentStatus: "Not Checked In",
        attendanceStatus: "Absent",
        totalWorkingMinutes: 0,
        totalBreakMinutes: 0,
        totalIdleMinutes: 0,
        breaks: [],
        timeline: [],
      };
    } else {
      attendance = await Attendance.findById(id).populate("employee", "fullName name companyEmail email department employeeId role designation avatar");
    }

    if (!attendance) {
      return res.status(404).json({ success: false, message: "Attendance record not found" });
    }

    // MANDATORY RBAC DATA ISOLATION (ProjectRules.md)
    if (req.user?.role === "Employee") {
      const recordEmpId = attendance.employee?._id?.toString() || attendance.employee?.toString();
      if (recordEmpId !== req.user._id?.toString()) {
        return res.status(403).json({ success: false, message: "Forbidden: You are restricted to your own attendance data only." });
      }
    }

    return res.status(200).json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Error in getAttendanceDetails:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch attendance details", error: error.message });
  }
};

/**
 * @desc    Admin Manual Upsert Attendance
 * @route   POST /api/attendance/manual
 * @access  Private (Admin only)
 */
export const manualUpsertAttendance = async (req, res) => {
  try {
    // MANDATORY RBAC ENFORCEMENT (ProjectRules.md)
    if (req.user?.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Forbidden: Admin authorization required to edit attendance manually." });
    }

    const { employeeId, date, checkInTime, checkOutTime, attendanceStatus, currentStatus, adminRemarks } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({ success: false, message: "employeeId and date are required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    let attendance = await Attendance.findOne({ employee: employee._id, date });

    const previousData = attendance ? attendance.toObject() : null;

    const checkIn = checkInTime ? new Date(checkInTime) : attendance?.checkInTime || null;
    const checkOut = checkOutTime ? new Date(checkOutTime) : attendance?.checkOutTime || null;

    let totalWorkMins = 0;
    if (checkIn && checkOut) {
      const diffMs = checkOut.getTime() - checkIn.getTime();
      totalWorkMins = Math.max(0, Math.round(diffMs / 60000) - (attendance?.totalBreakMinutes || 0));
    }

    if (!attendance) {
      attendance = new Attendance({
        employee: employee._id,
        employeeCustomId: employee.employeeId || employee._id.toString(),
        date,
      });
    }

    attendance.checkInTime = checkIn;
    attendance.checkOutTime = checkOut;
    attendance.attendanceStatus = attendanceStatus || attendance.attendanceStatus || "Present";
    attendance.currentStatus = currentStatus || (checkOut ? "Checked Out" : checkIn ? "Working" : "Not Checked In");
    attendance.totalWorkingMinutes = totalWorkMins;
    if (adminRemarks) attendance.adminRemarks = adminRemarks;

    attendance.timeline.push({
      eventType: "Manual Edit",
      timestamp: new Date(),
      description: `Manual update by Admin. Remarks: ${adminRemarks || "None"}`,
      source: "Admin System",
    });

    attendance.auditLogs.push({
      action: previousData ? "MANUAL_UPDATE" : "MANUAL_CREATE",
      updatedBy: req.user?._id || null,
      previousData,
      newData: attendance.toObject(),
      timestamp: new Date(),
    });

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Attendance updated manually",
      attendance,
    });
  } catch (error) {
    console.error("Error in manualUpsertAttendance:", error);
    return res.status(500).json({ success: false, message: "Failed to update manual attendance", error: error.message });
  }
};

/**
 * @desc    Submit Attendance Correction Request
 * @route   POST /api/attendance/request-correction
 * @access  Private
 */
export const requestCorrection = async (req, res) => {
  try {
    const employeeId = req.user?.role === "Admin" && req.body.employeeId ? req.body.employeeId : req.user?._id;
    const { attendanceId, date, checkInTime, checkOutTime, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: "Reason for correction is required" });
    }

    let attendance = null;
    if (attendanceId && !attendanceId.startsWith("virtual-")) {
      attendance = await Attendance.findById(attendanceId);
      if (!attendance) {
        return res.status(404).json({ success: false, message: "Attendance record not found" });
      }
      // Non-admins can ONLY submit corrections on their own record
      if (req.user?.role === "Employee" && attendance.employee?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Forbidden: You cannot request corrections on another employee's record." });
      }
    } else {
      const dateStr = date || getTodayDateString();
      attendance = await Attendance.findOne({ employee: employeeId, date: dateStr });
      if (!attendance) {
        attendance = await Attendance.create({
          employee: employeeId,
          date: dateStr,
          currentStatus: "Not Checked In",
          attendanceStatus: "Absent",
        });
      }
    }

    attendance.correctionRequests.push({
      requestedBy: employeeId,
      checkInTime: checkInTime ? new Date(checkInTime) : null,
      checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
      reason,
      status: "Pending",
      requestedAt: new Date(),
    });

    attendance.timeline.push({
      eventType: "Correction Submitted",
      timestamp: new Date(),
      description: `Correction request submitted: ${reason}`,
      source: "Web App",
    });

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Correction request submitted successfully",
      attendance,
    });
  } catch (error) {
    console.error("Error in requestCorrection:", error);
    return res.status(500).json({ success: false, message: "Failed to submit correction request", error: error.message });
  }
};

/**
 * @desc    Approve/Reject Correction Request (Admin)
 * @route   POST /api/attendance/approve-correction
 * @access  Private (Admin)
 */
export const approveCorrection = async (req, res) => {
  try {
    // MANDATORY RBAC ENFORCEMENT (ProjectRules.md)
    if (req.user?.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Forbidden: Admin authorization required to approve correction requests." });
    }

    const { attendanceId, requestId, action } = req.body; // action: 'Approved' | 'Rejected'

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ success: false, message: "Attendance record not found" });
    }

    const requestObj = attendance.correctionRequests.id(requestId);
    if (!requestObj) {
      return res.status(404).json({ success: false, message: "Correction request not found" });
    }

    requestObj.status = action === "Approved" ? "Approved" : "Rejected";
    requestObj.reviewedBy = req.user?._id || null;
    requestObj.reviewedAt = new Date();

    if (action === "Approved") {
      if (requestObj.checkInTime) attendance.checkInTime = requestObj.checkInTime;
      if (requestObj.checkOutTime) attendance.checkOutTime = requestObj.checkOutTime;

      if (attendance.checkInTime && attendance.checkOutTime) {
        const diffMs = new Date(attendance.checkOutTime).getTime() - new Date(attendance.checkInTime).getTime();
        attendance.totalWorkingMinutes = Math.max(0, Math.round(diffMs / 60000) - (attendance.totalBreakMinutes || 0));
        attendance.currentStatus = "Checked Out";
      }

      attendance.timeline.push({
        eventType: "Correction Approved",
        timestamp: new Date(),
        description: `Correction request approved by Admin`,
        source: "Admin System",
      });
    }

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: `Correction request ${action.toLowerCase()}`,
      attendance,
    });
  } catch (error) {
    console.error("Error in approveCorrection:", error);
    return res.status(500).json({ success: false, message: "Failed to process correction request", error: error.message });
  }
};

/**
 * @desc    Get Attendance Reports (Daily, Weekly, Monthly, Employee-wise)
 * @route   GET /api/attendance/reports
 * @access  Private
 */
export const getAttendanceReports = async (req, res) => {
  try {
    const { type = "daily", startDate, endDate, employeeId } = req.query;

    const filter = {};
    // MANDATORY RBAC DATA ISOLATION (ProjectRules.md)
    if (req.user?.role === "Employee") {
      filter.employee = req.user._id;
    } else if (employeeId) {
      filter.employee = employeeId;
    }

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else {
      const todayStr = getTodayDateString();
      filter.date = { $lte: todayStr };
    }

    const records = await Attendance.find(filter)
      .populate("employee", "name email department employeeId role")
      .sort({ date: -1 });

    let totalWorkingHoursSum = 0;
    let totalBreakHoursSum = 0;
    let totalIdleMinutesSum = 0;
    let lateCheckInsCount = 0;

    const reportRows = records.map((r) => {
      const workHrs = ((r.totalWorkingMinutes || 0) / 60).toFixed(1);
      const breakHrs = ((r.totalBreakMinutes || 0) / 60).toFixed(1);
      totalWorkingHoursSum += r.totalWorkingMinutes || 0;
      totalBreakHoursSum += r.totalBreakMinutes || 0;
      totalIdleMinutesSum += r.totalIdleMinutes || 0;

      if (r.attendanceStatus === "Late Check-In") lateCheckInsCount++;

      return {
        date: r.date,
        employeeName: r.employee?.name || "Unknown",
        employeeId: r.employeeCustomId || r.employee?.employeeId || "N/A",
        department: r.employee?.department || "General",
        checkInTime: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "-",
        checkOutTime: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "-",
        workingHours: workHrs,
        breakHours: breakHrs,
        status: r.currentStatus,
        attendanceStatus: r.attendanceStatus,
      };
    });

    return res.status(200).json({
      success: true,
      reportType: type,
      summary: {
        totalRecords: records.length,
        totalWorkingHours: (totalWorkingHoursSum / 60).toFixed(1),
        totalBreakHours: (totalBreakHoursSum / 60).toFixed(1),
        totalIdleMinutes: totalIdleMinutesSum,
        lateCheckIns: lateCheckInsCount,
      },
      rows: reportRows,
    });
  } catch (error) {
    console.error("Error in getAttendanceReports:", error);
    return res.status(500).json({ success: false, message: "Failed to generate attendance reports", error: error.message });
  }
};

/**
 * @desc    Save Attendance Note
 * @route   POST /api/attendance/note
 * @access  Private
 */
export const saveAttendanceNote = async (req, res) => {
  try {
    const employeeId = req.user?._id;
    const { date, note } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    let attendance = await Attendance.findOne({ employee: employeeId, date });
    if (!attendance) {
      attendance = new Attendance({
        employee: employeeId,
        date,
        currentStatus: "Not Checked In",
        attendanceStatus: "Absent",
      });
    }

    attendance.notes = note || "";
    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Attendance note saved successfully",
      attendance,
    });
  } catch (error) {
    console.error("Error in saveAttendanceNote:", error);
    return res.status(500).json({ success: false, message: "Failed to save note", error: error.message });
  }
};

/**
 * @desc    Get Attendance Security Status for current employee/request
 * @route   GET /api/attendance/security-status
 * @access  Private
 */
export const getEmployeeSecurityStatus = async (req, res) => {
  try {
    const employeeId = req.user?._id;
    const clientIp = getClientIp(req);
    const lat = req.query.latitude ? Number(req.query.latitude) : null;
    const lng = req.query.longitude ? Number(req.query.longitude) : null;

    const accessCheck = await validateAttendanceAccess(employeeId, {
      ip: clientIp,
      latitude: lat,
      longitude: lng,
    });

    return res.status(200).json({
      success: true,
      clientIp,
      validation: accessCheck,
    });
  } catch (error) {
    console.error("Error in getEmployeeSecurityStatus:", error);
    return res.status(500).json({ success: false, message: "Failed to get security status", error: error.message });
  }
};

/**
 * @desc    Get all IP Whitelist entries
 * @route   GET /api/attendance/whitelist
 * @access  Private (Admin)
 */
export const getWhitelists = async (req, res) => {
  try {
    const { status, scope, type, search } = req.query;
    let query = {};
    if (status && status !== "all") query.status = status;
    if (scope && scope !== "all") query.scope = scope;
    if (type && type !== "all") query.type = type;
    if (search) {
      query.$or = [
        { ipAddress: { $regex: search, $options: "i" } },
        { locationName: { $regex: search, $options: "i" } },
      ];
    }

    const whitelists = await IpWhitelist.find(query)
      .populate("employee", "fullName employeeId email designation department companyEmail")
      .populate("wfhRequestId")
      .populate("addedBy", "fullName email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, whitelists });
  } catch (error) {
    console.error("Error in getWhitelists:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch IP whitelists", error: error.message });
  }
};

/**
 * @desc    Create manual IP Whitelist entry
 * @route   POST /api/attendance/whitelist
 * @access  Private (Admin)
 */
export const createWhitelist = async (req, res) => {
  try {
    const {
      ipAddress,
      scope,
      employeeId,
      locationName,
      expiryType,
      customExpiryDate,
      type,
      notes,
    } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ success: false, message: "IP address is required" });
    }

    let expiresAt = null;
    const now = new Date();
    if (expiryType === "24 Hours" || expiryType === "1 Day" || expiryType === "24 hrs") {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (expiryType === "3 days") {
      expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    } else if (expiryType === "1 Week" || expiryType === "1 week") {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (expiryType === "1 Month") {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (expiryType === "Custom" && customExpiryDate) {
      expiresAt = new Date(customExpiryDate);
    }

    const newWhitelist = await IpWhitelist.create({
      ipAddress: ipAddress.trim(),
      scope: scope || "Organization",
      employee: scope === "Employee" && employeeId ? employeeId : null,
      locationName: locationName || "Manually Whitelisted Network",
      addedBy: req.user?._id,
      expiryType: expiryType || "Never",
      expiresAt,
      status: "Active",
      type: type || "Permanent",
      notes: notes || "",
    });

    await logSecurityAudit({
      action: "WHITELIST_CREATED",
      performedBy: req.user?._id,
      employee: scope === "Employee" ? employeeId : null,
      ip: ipAddress,
      location: locationName || "Manually Whitelisted Network",
      reason: `Manually added ${type || 'Permanent'} whitelist (${expiryType || 'Never'})`,
      matchedRule: newWhitelist._id,
    });

    return res.status(201).json({
      success: true,
      message: "IP address whitelisted successfully",
      whitelist: newWhitelist,
    });
  } catch (error) {
    console.error("Error in createWhitelist:", error);
    return res.status(500).json({ success: false, message: "Failed to create IP whitelist entry", error: error.message });
  }
};

/**
 * @desc    Update IP Whitelist status / fields
 * @route   PUT /api/attendance/whitelist/:id
 * @access  Private (Admin)
 */
export const updateWhitelist = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, locationName, notes } = req.body;

    const whitelist = await IpWhitelist.findById(id);
    if (!whitelist) {
      return res.status(404).json({ success: false, message: "Whitelist entry not found" });
    }

    if (status) whitelist.status = status;
    if (locationName) whitelist.locationName = locationName;
    if (notes !== undefined) whitelist.notes = notes;

    await whitelist.save();

    await logSecurityAudit({
      action: "WHITELIST_UPDATED",
      performedBy: req.user?._id,
      employee: whitelist.employee,
      ip: whitelist.ipAddress,
      location: whitelist.locationName,
      reason: `Updated status to ${whitelist.status}`,
      matchedRule: whitelist._id,
    });

    return res.status(200).json({ success: true, message: "Whitelist entry updated", whitelist });
  } catch (error) {
    console.error("Error in updateWhitelist:", error);
    return res.status(500).json({ success: false, message: "Failed to update whitelist entry", error: error.message });
  }
};

/**
 * @desc    Delete/Deactivate IP Whitelist entry
 * @route   DELETE /api/attendance/whitelist/:id
 * @access  Private (Admin)
 */
export const deleteWhitelist = async (req, res) => {
  try {
    const { id } = req.params;
    const whitelist = await IpWhitelist.findById(id);
    if (!whitelist) {
      return res.status(404).json({ success: false, message: "Whitelist entry not found" });
    }

    if (whitelist.wfhRequestId) {
      await WfhRequest.findByIdAndUpdate(whitelist.wfhRequestId, {
        status: "Cancelled",
        rejectionReason: "Revoked by Administrator",
      });
    } else if (whitelist.employee && whitelist.type === "WFH") {
      await WfhRequest.updateMany(
        { employee: whitelist.employee, status: "Approved" },
        { status: "Cancelled", rejectionReason: "Revoked by Administrator" }
      );
    }

    await IpWhitelist.findByIdAndDelete(id);

    await logSecurityAudit({
      action: "WHITELIST_DELETED",
      performedBy: req.user?._id,
      employee: whitelist.employee,
      ip: whitelist.ipAddress,
      location: whitelist.locationName,
      reason: "Revoked whitelist authorization",
      matchedRule: whitelist._id,
    });

    return res.status(200).json({ success: true, message: "Whitelist authorization and remote access revoked successfully" });
  } catch (error) {
    console.error("Error in deleteWhitelist:", error);
    return res.status(500).json({ success: false, message: "Failed to delete whitelist entry", error: error.message });
  }
};

/**
 * @desc    Get all Office & Employee Registered Locations
 * @route   GET /api/attendance/locations
 * @access  Private
 */
export const getLocations = async (req, res) => {
  try {
    const locations = await EmployeeLocation.find()
      .populate("employee", "fullName employeeId email designation")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, locations });
  } catch (error) {
    console.error("Error in getLocations:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch locations", error: error.message });
  }
};

/**
 * @desc    Create registered Office / Employee Location
 * @route   POST /api/attendance/locations
 * @access  Private (Admin)
 */
export const createLocation = async (req, res) => {
  try {
    const { locationName, latitude, longitude, radiusMeters, isOrgWide, employeeId, address } = req.body;

    if (!locationName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: "Location name, latitude, and longitude are required" });
    }

    const newLoc = await EmployeeLocation.create({
      locationName: locationName.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radiusMeters) || 100,
      isOrgWide: isOrgWide !== undefined ? !!isOrgWide : true,
      employee: !isOrgWide && employeeId ? employeeId : null,
      address: address || "",
      status: "Active",
    });

    await logSecurityAudit({
      action: "LOCATION_CREATED",
      performedBy: req.user?._id,
      employee: newLoc.employee,
      location: newLoc.locationName,
      reason: `Created registered location (${newLoc.radiusMeters}m radius)`,
    });

    return res.status(201).json({ success: true, message: "Location registered successfully", location: newLoc });
  } catch (error) {
    console.error("Error in createLocation:", error);
    return res.status(500).json({ success: false, message: "Failed to create location", error: error.message });
  }
};

/**
 * @desc    Update Registered Location
 * @route   PUT /api/attendance/locations/:id
 * @access  Private (Admin)
 */
export const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { locationName, latitude, longitude, radiusMeters, status, isOrgWide, employeeId, address } = req.body;

    const loc = await EmployeeLocation.findById(id);
    if (!loc) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    if (locationName) loc.locationName = locationName;
    if (latitude !== undefined) loc.latitude = Number(latitude);
    if (longitude !== undefined) loc.longitude = Number(longitude);
    if (radiusMeters !== undefined) loc.radiusMeters = Number(radiusMeters);
    if (status) loc.status = status;
    if (isOrgWide !== undefined) loc.isOrgWide = !!isOrgWide;
    if (employeeId !== undefined) loc.employee = employeeId || null;
    if (address !== undefined) loc.address = address;

    await loc.save();

    return res.status(200).json({ success: true, message: "Location updated successfully", location: loc });
  } catch (error) {
    console.error("Error in updateLocation:", error);
    return res.status(500).json({ success: false, message: "Failed to update location", error: error.message });
  }
};

/**
 * @desc    Delete Registered Location
 * @route   DELETE /api/attendance/locations/:id
 * @access  Private (Admin)
 */
export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    await EmployeeLocation.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error in deleteLocation:", error);
    return res.status(500).json({ success: false, message: "Failed to delete location", error: error.message });
  }
};

/**
 * @desc    Employee Submit Work From Home Request
 * @route   POST /api/attendance/wfh-request
 * @access  Private (Employee)
 */
export const createWfhRequest = async (req, res) => {
  try {
    const employeeId = req.user?._id;
    const { startDate, endDate, duration, reason, latitude, longitude, locationName } = req.body;

    // Enforce only one pending WFH request at a time
    const existingPending = await WfhRequest.findOne({
      employee: employeeId,
      status: "Pending",
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending WFH request. Please cancel it before submitting a new request.",
        existingRequest: existingPending,
      });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const clientIp = getClientIp(req);

    let durationHours = 24;
    const dur = String(duration || "").toLowerCase();
    if (dur.includes("24") || dur.includes("1 day")) {
      durationHours = 24;
    } else if (dur.includes("3 day") || dur.includes("3 days")) {
      durationHours = 3 * 24;
    } else if (dur.includes("week")) {
      durationHours = 7 * 24;
    }

    const end = endDate ? new Date(endDate) : new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    const wfhReq = await WfhRequest.create({
      employee: employeeId,
      startDate: start,
      endDate: end,
      duration: duration || "24 hrs",
      reason: reason || "",
      requestIp: clientIp,
      requestLatitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
      requestLongitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
      requestLocation: locationName || "Remote / Home Network",
      status: "Pending",
    });

    await logSecurityAudit({
      action: "WFH_REQUESTED",
      performedBy: employeeId,
      employee: employeeId,
      ip: clientIp,
      location: locationName || "Remote / Home Network",
      reason: `Submitted WFH request (${duration || '24 hrs'}): ${reason || 'No reason provided'}`,
    });

    return res.status(201).json({
      success: true,
      message: "Work From Home request submitted successfully for approval",
      wfhRequest: wfhReq,
    });
  } catch (error) {
    console.error("Error in createWfhRequest:", error);
    return res.status(500).json({ success: false, message: "Failed to submit WFH request", error: error.message });
  }
};

/**
 * @desc    Get WFH Requests
 * @route   GET /api/attendance/wfh-requests
 * @access  Private
 */
export const getWfhRequests = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    // Employees only see their own requests
    if (req.user?.role === "Employee") {
      query.employee = req.user._id;
    }
    if (status && status !== "all") {
      query.status = status;
    }

    const requests = await WfhRequest.find(query)
      .populate("employee", "fullName employeeId email designation department profilePicture")
      .populate("reviewedBy", "fullName email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error("Error in getWfhRequests:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch WFH requests", error: error.message });
  }
};

/**
 * @desc    Admin Approve WFH Request & Create Temporary Whitelist Entry
 * @route   PUT /api/attendance/wfh-requests/:id/approve
 * @access  Private (Admin)
 */
export const approveWfhRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { customDurationHours, adminComments } = req.body;

    const wfhReq = await WfhRequest.findById(id).populate("employee");
    if (!wfhReq) {
      return res.status(404).json({ success: false, message: "WFH request not found" });
    }

    if (wfhReq.status === "Approved") {
      return res.status(400).json({ success: false, message: "WFH request is already approved" });
    }

    const now = new Date();
    let hoursToExpiry = 24; // default 24h
    const dur = String(wfhReq.duration || "").toLowerCase();
    if (dur.includes("24") || dur.includes("1 day")) {
      hoursToExpiry = 24;
    } else if (dur.includes("3 day") || dur.includes("3 days")) {
      hoursToExpiry = 3 * 24;
    } else if (dur.includes("week")) {
      hoursToExpiry = 7 * 24;
    } else if (customDurationHours && Number(customDurationHours) > 0) {
      hoursToExpiry = Number(customDurationHours);
    }

    const expiresAt = new Date(now.getTime() + hoursToExpiry * 60 * 60 * 1000);
    const empId = wfhReq.employee?._id || wfhReq.employee;

    // Auto-create temporary IP whitelist entry for this employee
    const tempWhitelist = await IpWhitelist.create({
      ipAddress: wfhReq.requestIp || getClientIp(req),
      scope: "Employee",
      employee: empId,
      locationName: `Approved WFH: ${wfhReq.requestLocation || 'Home Network'}`,
      addedBy: req.user?._id,
      expiryType: wfhReq.duration || "24 hrs",
      expiresAt,
      status: "Active",
      type: "WFH",
      wfhRequestId: wfhReq._id,
      notes: `Auto-generated via WFH approval. Reason: ${wfhReq.reason || 'None'}${adminComments ? ` | Admin Notes: ${adminComments}` : ''}`,
    });

    wfhReq.status = "Approved";
    wfhReq.endDate = expiresAt;
    wfhReq.reviewedBy = req.user?._id;
    wfhReq.reviewedAt = now;
    if (adminComments) wfhReq.rejectionReason = adminComments;
    wfhReq.createdWhitelistId = tempWhitelist._id;
    await wfhReq.save();

    await logSecurityAudit({
      action: "WFH_APPROVED",
      performedBy: req.user?._id,
      employee: empId,
      ip: tempWhitelist.ipAddress,
      location: tempWhitelist.locationName,
      reason: `Approved WFH request until ${expiresAt.toLocaleString()}`,
      matchedRule: tempWhitelist._id,
    });

    return res.status(200).json({
      success: true,
      message: `WFH request approved. Temporary IP whitelist active for ${hoursToExpiry} hours.`,
      wfhRequest: wfhReq,
      whitelist: tempWhitelist,
    });
  } catch (error) {
    console.error("Error in approveWfhRequest:", error);
    return res.status(500).json({ success: false, message: "Failed to approve WFH request", error: error.message });
  }
};

/**
 * @desc    Admin Reject WFH Request
 * @route   PUT /api/attendance/wfh-requests/:id/reject
 * @access  Private (Admin)
 */
export const rejectWfhRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const wfhReq = await WfhRequest.findById(id);
    if (!wfhReq) {
      return res.status(404).json({ success: false, message: "WFH request not found" });
    }

    wfhReq.status = "Rejected";
    wfhReq.reviewedBy = req.user?._id;
    wfhReq.reviewedAt = new Date();
    wfhReq.rejectionReason = rejectionReason || "Rejected by administrator";
    await wfhReq.save();

    await logSecurityAudit({
      action: "WFH_REJECTED",
      performedBy: req.user?._id,
      employee: wfhReq.employee,
      ip: wfhReq.requestIp,
      reason: `Rejected WFH request: ${rejectionReason || 'No reason provided'}`,
    });

    return res.status(200).json({
      success: true,
      message: "WFH request rejected",
      wfhRequest: wfhReq,
    });
  } catch (error) {
    console.error("Error in rejectWfhRequest:", error);
    return res.status(500).json({ success: false, message: "Failed to reject WFH request", error: error.message });
  }
};

/**
 * @desc    Employee or Admin Cancel WFH Request
 * @route   PUT /api/attendance/wfh-requests/:id/cancel
 * @access  Private (Employee or Admin)
 */
export const cancelWfhRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user?._id;

    const wfhReq = await WfhRequest.findById(id);
    if (!wfhReq) {
      return res.status(404).json({ success: false, message: "WFH request not found" });
    }

    if (req.user?.role !== "Admin" && String(wfhReq.employee) !== String(employeeId)) {
      return res.status(403).json({ success: false, message: "Unauthorized to cancel this request" });
    }

    if (wfhReq.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Request is already cancelled" });
    }

    if (wfhReq.createdWhitelistId) {
      try {
        await IpWhitelist.findByIdAndUpdate(wfhReq.createdWhitelistId, {
          status: "Expired",
          expiresAt: new Date(),
        });
      } catch (e) {}
    }

    wfhReq.status = "Cancelled";
    await wfhReq.save();

    await logSecurityAudit({
      action: "WFH_CANCELLED",
      performedBy: employeeId,
      employee: wfhReq.employee,
      ip: getClientIp(req),
      location: wfhReq.requestLocation,
      reason: `Cancelled WFH request (${wfhReq.duration})`,
    });

    return res.status(200).json({
      success: true,
      message: "WFH request cancelled successfully",
      wfhRequest: wfhReq,
    });
  } catch (error) {
    console.error("Error in cancelWfhRequest:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel WFH request", error: error.message });
  }
};

/**
 * @desc    Get Security Audit Logs
 * @route   GET /api/attendance/audit-logs
 * @access  Private (Admin)
 */
export const getSecurityAuditLogs = async (req, res) => {
  try {
    const { action, ip, search } = req.query;
    let query = {};
    if (action && action !== "all") query.action = action;
    if (ip) query.ip = { $regex: ip, $options: "i" };
    if (search) {
      query.$or = [
        { ip: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } },
      ];
    }

    const logs = await AttendanceSecurityAudit.find(query)
      .populate("performedBy", "fullName email")
      .populate("employee", "fullName employeeId email designation")
      .sort({ timestamp: -1 })
      .limit(500);

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error("Error in getSecurityAuditLogs:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch security audit logs", error: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ── UPGRADED ADMIN ATTENDANCE SUITE CONTROLLERS ───────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get Organization-wide Admin Attendance Dashboard
 * @route   GET /api/attendance/admin/dashboard
 * @access  Private (Admin / Manager)
 */
export const getAdminDashboard = async (req, res) => {
  try {
    const { date, department, location, shift, status } = req.query;
    const targetDate = date || getTodayDateString();

    // Fetch all active employees
    let empQuery = { status: { $ne: "Inactive" } };
    if (department && department !== "All") empQuery.department = department;
    if (location && location !== "All") empQuery.workLocation = location;
    if (shift && shift !== "All") empQuery.employmentType = shift;

    const employees = await Employee.find(empQuery).select(
      "_id employeeId fullName companyEmail department designation workLocation employmentType"
    );

    const totalEmployees = employees.length;
    const employeeIds = employees.map((e) => e._id);

    // Fetch attendance records for target date
    let attQuery = { date: targetDate, employee: { $in: employeeIds } };
    if (status && status !== "All") {
      attQuery.attendanceStatus = status;
    }

    const attendanceRecords = await Attendance.find(attQuery).populate(
      "employee",
      "fullName employeeId department designation"
    );

    const recordMap = new Map();
    attendanceRecords.forEach((r) => {
      if (r.employee?._id) {
        recordMap.set(r.employee._id.toString(), r);
      }
    });

    let presentCount = 0;
    let absentCount = 0;
    let wfhCount = 0;
    let onDutyCount = 0;
    let onBreakCount = 0;
    let currentlyWorkingCount = 0;
    let notClockedInCount = 0;
    let lateArrivalsCount = 0;
    let earlyCheckoutCount = 0;
    let overtimeCount = 0;
    let totalWorkingMinutesSum = 0;

    employees.forEach((emp) => {
      const rec = recordMap.get(emp._id.toString());
      if (rec && rec.checkInTime) {
        presentCount++;
        totalWorkingMinutesSum += rec.totalWorkingMinutes || 0;

        if (rec.locationMode === "WFH" || rec.isRemote) wfhCount++;
        if (rec.locationMode === "On-Duty") onDutyCount++;

        if (rec.currentStatus === "On Break") onBreakCount++;
        else if (rec.currentStatus === "Working" || rec.currentStatus === "Checked In") {
          currentlyWorkingCount++;
        }

        if (rec.isLate || rec.attendanceStatus === "Late Check-In") lateArrivalsCount++;
        if (rec.isEarlyCheckout) earlyCheckoutCount++;
        if ((rec.overtimeMinutes || 0) > 0) overtimeCount++;
      } else {
        absentCount++;
        notClockedInCount++;
      }
    });

    // Pending Requests
    const pendingWfh = await WfhRequest.countDocuments({ status: "Pending" });
    const pendingCorrectionDocs = await Attendance.find({ "correctionRequests.status": "Pending" });
    let pendingRegularizations = 0;
    pendingCorrectionDocs.forEach((d) => {
      d.correctionRequests.forEach((c) => {
        if (c.status === "Pending") pendingRegularizations++;
      });
    });
    const pendingOnDuty = OnDutyRequest ? await OnDutyRequest.countDocuments({ status: "Pending" }) : 0;
    const totalPendingRequests = pendingWfh + pendingRegularizations + pendingOnDuty;

    // Open Exceptions
    const openExceptions = await AttendanceException.countDocuments({
      status: { $in: ["Open", "Under Review"] },
      ...(date ? { date: targetDate } : {}),
    });

    // Department-wise distribution
    const deptMap = {};
    employees.forEach((emp) => {
      const dept = emp.department || "General";
      if (!deptMap[dept]) {
        deptMap[dept] = { total: 0, present: 0, absent: 0, wfh: 0 };
      }
      deptMap[dept].total++;
      const rec = recordMap.get(emp._id.toString());
      if (rec && rec.checkInTime) {
        deptMap[dept].present++;
        if (rec.locationMode === "WFH" || rec.isRemote) deptMap[dept].wfh++;
      } else {
        deptMap[dept].absent++;
      }
    });

    const departmentStats = Object.keys(deptMap).map((k) => ({
      department: k,
      ...deptMap[k],
    }));

    const avgWorkingHours =
      presentCount > 0 ? (totalWorkingMinutesSum / 60 / presentCount).toFixed(1) : "0.0";

    return res.status(200).json({
      success: true,
      date: targetDate,
      kpis: {
        totalEmployees,
        present: presentCount,
        absent: absentCount,
        wfh: wfhCount,
        onDuty: onDutyCount,
        onBreak: onBreakCount,
        currentlyWorking: currentlyWorkingCount,
        notClockedIn: notClockedInCount,
        lateArrivals: lateArrivalsCount,
        earlyCheckouts: earlyCheckoutCount,
        overtime: overtimeCount,
        pendingRequests: totalPendingRequests,
        pendingWfh,
        pendingRegularizations,
        pendingOnDuty,
        attendanceExceptions: openExceptions,
        avgWorkingHours,
      },
      departmentStats,
    });
  } catch (error) {
    console.error("Error in getAdminDashboard:", error);
    return res.status(500).json({ success: false, message: "Failed to load admin attendance dashboard", error: error.message });
  }
};

/**
 * @desc    Get Real-time Live Attendance Board
 * @route   GET /api/attendance/admin/live
 * @access  Private (Admin / Manager)
 */
export const getAdminLiveAttendance = async (req, res) => {
  try {
    const cleanStr = (val) => (val && val !== "all" && val !== "All" && val !== "undefined" && val !== "null" && typeof val === "string" && val.trim() !== "" ? val.trim() : null);

    const targetSearch = cleanStr(req.query.search);
    const targetDept = cleanStr(req.query.department);
    const targetStatus = cleanStr(req.query.status);
    const targetLocation = cleanStr(req.query.locationMode || req.query.location);
    const today = getTodayDateString();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch all employees
    let empQuery = {};
    if (targetDept) empQuery.department = targetDept;
    if (targetLocation) empQuery.workLocation = targetLocation;
    if (targetSearch) {
      empQuery.$or = [
        { fullName: { $regex: targetSearch, $options: "i" } },
        { employeeId: { $regex: targetSearch, $options: "i" } },
        { designation: { $regex: targetSearch, $options: "i" } },
        { companyEmail: { $regex: targetSearch, $options: "i" } },
      ];
    }

    const employees = await Employee.find(empQuery)
      .select("fullName employeeId department designation workLocation companyEmail status")
      .sort({ fullName: 1 });

    const allDepartments = await Employee.distinct("department");
    const allLocations = await Employee.distinct("workLocation");

    // Fetch ALL attendance records for today (matching date string, ISO, or check-in timestamp)
    const attendances = await Attendance.find({
      $or: [
        { date: today },
        { date: new Date().toISOString().split("T")[0] },
        { checkInTime: { $gte: todayStart, $lte: todayEnd } },
        { createdAt: { $gte: todayStart, $lte: todayEnd } },
      ],
    }).populate("employee", "fullName employeeId department designation workLocation companyEmail status");

    const attMap = new Map();
    attendances.forEach((a) => {
      const empIdStr = a.employee?._id?.toString() || (typeof a.employee === "object" && a.employee ? a.employee._id?.toString() : a.employee?.toString());
      if (empIdStr) {
        attMap.set(empIdStr, a);
      }
      if (a.employeeCustomId) {
        attMap.set(a.employeeCustomId, a);
      }
    });

    const now = new Date();
    const processedEmpIds = new Set();
    const liveRows = [];

    for (const emp of employees) {
      processedEmpIds.add(emp._id.toString());
      const att = attMap.get(emp._id.toString()) || (emp.employeeId ? attMap.get(emp.employeeId) : null);

      let liveStatus = "Not Clocked In";
      let clockIn = null;
      let clockOut = null;
      let currentBreak = null;
      let breakDurationMinutes = 0;
      let netWorkingMinutes = 0;
      let mode = emp.workLocation || "Office";
      let currentLocation = emp.workLocation || "Headquarters";
      let isLate = false;
      let overtimeMin = 0;
      let recordId = null;

      if (att) {
        recordId = att._id;
        clockIn = att.checkInTime;
        clockOut = att.checkOutTime;
        breakDurationMinutes = att.totalBreakMinutes || 0;
        netWorkingMinutes = att.totalWorkingMinutes || 0;
        mode = att.locationMode || (att.isRemote ? "WFH" : "Office");
        currentLocation = att.clockInLocation || att.clockOutLocation || (att.isRemote ? "Remote / WFH" : mode);
        isLate = !!(att.isLate || att.attendanceStatus === "Late Check-In");
        overtimeMin = att.overtimeMinutes || 0;

        if (att.checkOutTime) {
          liveStatus = "Completed";
        } else if (att.currentStatus === "On Break" || (att.breaks && att.breaks.some((b) => !b.endTime))) {
          liveStatus = "On Break";
          const openBreak = (att.breaks || []).find((b) => !b.endTime);
          if (openBreak) {
            currentBreak = {
              type: openBreak.breakReason || "Break",
              startTime: openBreak.startTime,
              elapsedMinutes: Math.max(0, Math.floor((now - new Date(openBreak.startTime)) / 60000)),
            };
          }
        } else if (att.currentStatus === "Inactive" || att.currentStatus === "Idle" || (att.systemIdleSeconds && att.systemIdleSeconds >= 900)) {
          liveStatus = "Inactive";
        } else if (att.checkInTime || att.currentStatus === "Working" || att.currentStatus === "Checked In") {
          liveStatus = "Present";
        }
      }

      const totalHrs = clockIn
        ? clockOut
          ? Math.max(0, ((new Date(clockOut) - new Date(clockIn)) / 3600000) - (breakDurationMinutes / 60))
          : Math.max(0, ((now - new Date(clockIn)) / 3600000) - (breakDurationMinutes / 60))
        : 0;

      let lateMin = 0;
      if (att) {
        if (att.lateMinutes !== undefined && att.lateMinutes !== null && att.lateMinutes > 0) {
          lateMin = att.lateMinutes;
        } else if (clockIn && isLate) {
          const cDate = new Date(clockIn);
          const cMin = cDate.getHours() * 60 + cDate.getMinutes();
          lateMin = Math.max(0, cMin - (9 * 60 + 30));
        }
      }

      liveRows.push({
        _id: recordId || emp._id,
        recordId,
        user: {
          _id: emp._id,
          name: emp.fullName,
          fullName: emp.fullName,
          employeeId: emp.employeeId,
          department: emp.department || "General",
          designation: emp.designation,
          email: emp.companyEmail,
        },
        status: liveStatus,
        shift: att?.shift || "General (09:30 AM - 06:30 PM)",
        clockInTime: clockIn,
        clockOutTime: clockOut,
        activeBreak: currentBreak,
        totalBreakMinutes: breakDurationMinutes,
        totalHours: Number(totalHrs.toFixed(2)),
        grossHours: clockIn ? Number((((clockOut ? new Date(clockOut) : now) - new Date(clockIn)) / 3600000).toFixed(2)) : 0,
        breaks: att ? att.breaks || [] : [],
        locationMode: mode,
        clockInLocation: currentLocation,
        isLate,
        lateMinutes: lateMin,
        overtimeMinutes: overtimeMin,
      });
    }

    // Also include any attendance record that was checked in today whose employee was not in roster list
    for (const att of attendances) {
      const empObj = att.employee;
      const empIdStr = empObj?._id?.toString() || (typeof att.employee === "object" && att.employee ? att.employee._id?.toString() : att.employee?.toString());
      if (empIdStr && !processedEmpIds.has(empIdStr)) {
        processedEmpIds.add(empIdStr);
        const clockIn = att.checkInTime;
        const clockOut = att.checkOutTime;
        const breakDurationMinutes = att.totalBreakMinutes || 0;
        const mode = att.locationMode || (att.isRemote ? "WFH" : "Office");
        const currentLocation = att.clockInLocation || (att.isRemote ? "Remote / WFH" : mode);
        const isLate = !!(att.isLate || att.attendanceStatus === "Late Check-In");

        let liveStatus = "Not Clocked In";
        let currentBreak = null;
        if (att.checkOutTime) {
          liveStatus = "Completed";
        } else if (att.currentStatus === "On Break" || (att.breaks && att.breaks.some((b) => !b.endTime))) {
          liveStatus = "On Break";
          const openBreak = (att.breaks || []).find((b) => !b.endTime);
          if (openBreak) {
            currentBreak = {
              type: openBreak.breakReason || "Break",
              startTime: openBreak.startTime,
              elapsedMinutes: Math.max(0, Math.floor((now - new Date(openBreak.startTime)) / 60000)),
            };
          }
        } else if (att.currentStatus === "Inactive" || att.currentStatus === "Idle" || (att.systemIdleSeconds && att.systemIdleSeconds >= 900)) {
          liveStatus = "Inactive";
        } else if (att.checkInTime || att.currentStatus === "Working" || att.currentStatus === "Checked In") {
          liveStatus = "Present";
        }

        const totalHrs = clockIn
          ? clockOut
            ? Math.max(0, ((new Date(clockOut) - new Date(clockIn)) / 3600000) - (breakDurationMinutes / 60))
            : Math.max(0, ((now - new Date(clockIn)) / 3600000) - (breakDurationMinutes / 60))
          : 0;

        let lateMin = 0;
        if (att.lateMinutes !== undefined && att.lateMinutes !== null && att.lateMinutes > 0) {
          lateMin = att.lateMinutes;
        } else if (clockIn && isLate) {
          const cDate = new Date(clockIn);
          const cMin = cDate.getHours() * 60 + cDate.getMinutes();
          lateMin = Math.max(0, cMin - (9 * 60 + 30));
        }

        liveRows.push({
          _id: att._id,
          recordId: att._id,
          user: {
            _id: empObj?._id || empIdStr,
            name: empObj?.fullName || "Employee",
            fullName: empObj?.fullName || "Employee",
            employeeId: empObj?.employeeId || att.employeeCustomId || "EMP",
            department: empObj?.department || "General",
            designation: empObj?.designation || "Staff",
            email: empObj?.companyEmail || "",
          },
          status: liveStatus,
          shift: att.shift || "General (09:30 AM - 06:30 PM)",
          clockInTime: clockIn,
          clockOutTime: clockOut,
          activeBreak: currentBreak,
          totalBreakMinutes: breakDurationMinutes,
          totalHours: Number(totalHrs.toFixed(2)),
          grossHours: clockIn ? Number((((clockOut ? new Date(clockOut) : now) - new Date(clockIn)) / 3600000).toFixed(2)) : 0,
          breaks: att.breaks || [],
          locationMode: mode,
          clockInLocation: currentLocation,
          isLate,
          lateMinutes: lateMin,
          overtimeMinutes: att.overtimeMinutes || 0,
        });
      }
    }

    // Compute summary KPIs
    const summary = {
      totalActive: liveRows.filter((r) => r.clockInTime).length,
      checkedIn: liveRows.filter((r) => (r.status === "Present" || r.status === "Working") && !r.clockOutTime).length,
      inactive: liveRows.filter((r) => (r.status === "Inactive" || r.status === "Idle") && !r.clockOutTime).length,
      onBreak: liveRows.filter((r) => r.status === "On Break").length,
      checkedOut: liveRows.filter((r) => r.status === "Completed" || r.clockOutTime).length,
      wfh: liveRows.filter((r) => (r.locationMode === "WFH" || r.locationMode === "Remote") && r.clockInTime).length,
      lateArrivals: liveRows.filter((r) => r.isLate).length,
    };

    // Filter
    let filtered = liveRows;
    if (targetStatus) {
      const s = targetStatus.toLowerCase();
      if (s === "working") {
        filtered = filtered.filter((r) => (r.status === "Present" || r.status === "Working") && !r.clockOutTime);
      } else if (s === "inactive" || s === "idle") {
        filtered = filtered.filter((r) => (r.status === "Inactive" || r.status === "Idle") && !r.clockOutTime);
      } else if (s === "break") {
        filtered = filtered.filter((r) => r.status === "On Break");
      } else if (s === "checked_out") {
        filtered = filtered.filter((r) => r.status === "Completed" || r.clockOutTime);
      } else if (s === "not_clocked_in") {
        filtered = filtered.filter((r) => !r.clockInTime);
      } else {
        filtered = filtered.filter((r) => r.status.toLowerCase() === s);
      }
    }
    if (targetLocation) {
      filtered = filtered.filter((r) => r.locationMode?.toLowerCase() === targetLocation.toLowerCase());
    }

    return res.status(200).json({
      success: true,
      data: {
        summary,
        departments: allDepartments.filter(Boolean),
        locations: allLocations.filter(Boolean),
        records: filtered,
        total: filtered.length,
      },
    });
  } catch (error) {
    console.error("Error in getAdminLiveAttendance:", error);
    return res.status(500).json({ success: false, message: "Failed to load live attendance", error: error.message });
  }
};

/**
 * @desc    Get Filtered & Paginated Attendance Records
 * @route   GET /api/attendance/admin/records
 * @access  Private (Admin / Manager)
 */
export const getAdminRecords = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      department,
      employeeId,
      status,
      locationMode,
      search,
      page = 1,
      limit = 20,
      sort = "date_desc",
    } = req.query;

    let query = {};

    // Date range
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = startDate;
    }

    // Status filter
    if (status && status !== "All") {
      query.attendanceStatus = status;
    }

    // Location mode filter
    if (locationMode && locationMode !== "All") {
      query.locationMode = locationMode;
    }

    // Employee or Department Filter
    let empQuery = {};
    if (employeeId && employeeId !== "All") {
      empQuery._id = employeeId;
    }
    if (department && department !== "All") {
      empQuery.department = department;
    }
    if (search) {
      empQuery.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
      ];
    }

    if (Object.keys(empQuery).length > 0) {
      const matchedEmployees = await Employee.find(empQuery).select("_id");
      const matchedIds = matchedEmployees.map((e) => e._id);
      query.employee = { $in: matchedIds };
    }

    let sortObj = { date: -1, createdAt: -1 };
    if (sort === "date_asc") sortObj = { date: 1 };
    else if (sort === "hours_desc") sortObj = { totalWorkingMinutes: -1 };
    else if (sort === "hours_asc") sortObj = { totalWorkingMinutes: 1 };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .populate("employee", "fullName employeeId department designation companyEmail workLocation")
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      records,
    });
  } catch (error) {
    console.error("Error in getAdminRecords:", error);
    return res.status(500).json({ success: false, message: "Failed to load attendance records", error: error.message });
  }
};

/**
 * @desc    Get Organization / Employee Attendance Calendar Matrix
 * @route   GET /api/attendance/admin/calendar
 * @access  Private (Admin / Manager)
 */
export const getAdminCalendar = async (req, res) => {
  try {
    const { employeeId, department, month, year } = req.query;

    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const targetMonth = parseInt(month, 10) || new Date().getMonth() + 1;

    const monthStr = String(targetMonth).padStart(2, "0");
    const startDate = `${targetYear}-${monthStr}-01`;
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const endDate = `${targetYear}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

    let empQuery = {};
    if (employeeId && employeeId !== "All" && employeeId !== "all") empQuery._id = employeeId;
    if (department && department !== "All" && department !== "all") empQuery.department = department;

    const employees = await Employee.find(empQuery).select(
      "fullName name employeeId department designation email companyEmail"
    );

    const allDepartments = await Employee.distinct("department");
    const empIds = employees.map((e) => e._id);

    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
      employee: { $in: empIds },
    }).populate("employee", "fullName name employeeId department designation email companyEmail avatar");

    const todayStr = getTodayDateString();

    // Group by date
    const dayMap = {};
    attendances.forEach((att) => {
      if (!dayMap[att.date]) dayMap[att.date] = [];
      dayMap[att.date].push(att);
    });

    const daysList = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${targetYear}-${monthStr}-${String(d).padStart(2, "0")}`;
      const records = dayMap[dStr] || [];

      let present = 0;
      let wfh = 0;
      let halfDay = 0;
      let onLeave = 0;
      let late = 0;

      records.forEach((r) => {
        if (r.isLate) late++;
        const statusUpper = (r.status || r.attendanceStatus || "").toUpperCase();
        if (r.isHalfDay || statusUpper === "HALF DAY" || statusUpper === "HALF-DAY") {
          halfDay++;
        } else if (r.isRemote || r.locationMode === "WFH" || r.workMode === "Remote" || statusUpper === "WFH") {
          wfh++;
        } else if (statusUpper === "LEAVE" || statusUpper === "ON LEAVE") {
          onLeave++;
        } else if (r.checkInTime || statusUpper === "PRESENT" || r.currentStatus === "Working" || r.currentStatus === "Active") {
          present++;
        }
      });

      const dayOfWeek = new Date(targetYear, targetMonth - 1, d).getDay();
      const isWeekend = dayOfWeek === 0; // Sunday
      const isPastOrToday = dStr <= todayStr;
      const accountedFor = present + wfh + halfDay + onLeave;
      const absent = isPastOrToday && !isWeekend && employees.length > 0 
        ? Math.max(0, employees.length - accountedFor) 
        : 0;

      daysList.push({
        date: dStr,
        day: d,
        count: records.length,
        present,
        wfh,
        halfDay,
        onLeave,
        absent,
        late,
        records,
      });
    }

    const responsePayload = {
      month: targetMonth,
      year: targetYear,
      daysInMonth,
      totalEmployees: employees.length,
      employees,
      departments: allDepartments.filter(Boolean),
      calendarData: dayMap,
      days: daysList,
    };

    return res.status(200).json({
      success: true,
      data: responsePayload,
      ...responsePayload,
    });
  } catch (error) {
    console.error("Error in getAdminCalendar:", error);
    return res.status(500).json({ success: false, message: "Failed to load calendar", error: error.message });
  }
};

/**
 * @desc    Get All WFH Requests with Filters
 * @route   GET /api/attendance/admin/wfh-requests
 * @access  Private (Admin / Manager)
 */
export const getAdminWfhRequests = async (req, res) => {
  try {
    const { status, department, startDate, endDate, search, page = 1, limit = 20 } = req.query;

    let query = {};
    if (status && status !== "All") query.status = status;
    if (startDate && endDate) {
      query.startDate = { $lte: new Date(endDate) };
      query.endDate = { $gte: new Date(startDate) };
    }

    if (department && department !== "All") {
      const emps = await Employee.find({ department }).select("_id");
      query.employee = { $in: emps.map((e) => e._id) };
    }

    if (search) {
      const emps = await Employee.find({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { employeeId: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      query.employee = { $in: emps.map((e) => e._id) };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await WfhRequest.countDocuments(query);
    const requests = await WfhRequest.find(query)
      .populate("employee", "fullName employeeId department designation companyEmail")
      .populate("reviewedBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      requests,
    });
  } catch (error) {
    console.error("Error in getAdminWfhRequests:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch WFH requests", error: error.message });
  }
};

/**
 * @desc    Bulk Approve WFH Requests
 * @route   POST /api/attendance/admin/wfh-requests/bulk-approve
 * @access  Private (Admin)
 */
export const bulkApproveWfhAdmin = async (req, res) => {
  try {
    const ids = req.body.ids || req.body.requestIds;
    const comment = req.body.comment || req.body.adminComments;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No request IDs provided" });
    }

    const adminId = req.user?._id;
    const now = new Date();

    const wfhRequests = await WfhRequest.find({ _id: { $in: ids }, status: "Pending" }).populate("employee");

    let approvedCount = 0;
    for (const wfhReq of wfhRequests) {
      const dur = String(wfhReq.duration || "").toLowerCase();
      let hours = 24;
      if (dur.includes("24") || dur.includes("1 day")) hours = 24;
      else if (dur.includes("3 day") || dur.includes("3 days")) hours = 72;
      else if (dur.includes("week")) hours = 168;

      const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
      const empId = wfhReq.employee?._id || wfhReq.employee;

      let tempWhitelist = null;
      if (wfhReq.requestIp && wfhReq.requestIp !== "Unknown") {
        try {
          tempWhitelist = await IpWhitelist.create({
            ipAddress: wfhReq.requestIp,
            scope: "Employee",
            employee: empId,
            locationName: `Approved WFH: ${wfhReq.requestLocation || 'Home Network'}`,
            addedBy: adminId,
            expiryType: wfhReq.duration || "24 hrs",
            expiresAt,
            status: "Active",
            type: "WFH",
            wfhRequestId: wfhReq._id,
            notes: `Bulk approved WFH request: ${wfhReq.reason || 'None'}${comment ? ` | Admin Notes: ${comment}` : ''}`,
          });
        } catch (e) {
          console.warn("Could not create whitelist record on bulk WFH approval:", e.message);
        }
      }

      wfhReq.status = "Approved";
      wfhReq.endDate = expiresAt;
      wfhReq.reviewedBy = adminId;
      wfhReq.reviewedAt = now;
      if (comment) wfhReq.rejectionReason = comment;
      if (tempWhitelist) wfhReq.createdWhitelistId = tempWhitelist._id;
      await wfhReq.save();

      await logSecurityAudit({
        action: "Bulk Approved WFH",
        performedBy: adminId,
        employee: empId,
        ip: wfhReq.requestIp,
        reason: `Bulk approved WFH request (${comment || 'No comment'})`,
      });

      approvedCount++;
    }

    return res.status(200).json({
      success: true,
      message: `Successfully approved ${approvedCount} WFH requests.`,
      approvedCount,
    });
  } catch (error) {
    console.error("Error in bulkApproveWfhAdmin:", error);
    return res.status(500).json({ success: false, message: "Failed to bulk approve WFH requests", error: error.message });
  }
};

/**
 * @desc    Get All Regularization / Correction Requests
 * @route   GET /api/attendance/admin/regularizations
 * @access  Private (Admin / Manager)
 */
export const getAdminRegularizations = async (req, res) => {
  try {
    const { status, department, search, page = 1, limit = 20 } = req.query;

    const attendances = await Attendance.find({
      "correctionRequests.0": { $exists: true },
    })
      .populate("employee", "fullName employeeId department designation companyEmail")
      .populate("correctionRequests.requestedBy", "fullName employeeId")
      .populate("correctionRequests.reviewedBy", "fullName email");

    const flatList = [];
    attendances.forEach((att) => {
      (att.correctionRequests || []).forEach((cr) => {
        if (!status || status === "All" || cr.status === status) {
          if (!department || department === "All" || att.employee?.department === department) {
            if (
              !search ||
              att.employee?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
              att.employee?.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
              cr.reason?.toLowerCase().includes(search.toLowerCase())
            ) {
              flatList.push({
                _id: cr._id,
                attendanceId: att._id,
                date: att.date,
                employee: att.employee,
                existingCheckIn: att.checkInTime,
                existingCheckOut: att.checkOutTime,
                requestedCheckIn: cr.checkInTime,
                requestedCheckOut: cr.checkOutTime,
                reason: cr.reason,
                status: cr.status,
                requestedAt: cr.requestedAt,
                reviewedBy: cr.reviewedBy,
                reviewedAt: cr.reviewedAt,
                adminComment: cr.adminComment,
              });
            }
          }
        }
      });
    });

    flatList.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    const total = flatList.length;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const paginated = flatList.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      requests: paginated,
    });
  } catch (error) {
    console.error("Error in getAdminRegularizations:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch regularization requests", error: error.message });
  }
};

/**
 * @desc    Approve Regularization and Recalculate Attendance
 * @route   PUT /api/attendance/admin/regularizations/:id/approve
 * @access  Private (Admin)
 */
export const approveRegularizationAdmin = async (req, res) => {
  try {
    const { id } = req.params; // correctionRequest _id
    const { comment } = req.body;
    const adminId = req.user?._id;

    const attendance = await Attendance.findOne({ "correctionRequests._id": id }).populate("employee");
    if (!attendance) {
      return res.status(404).json({ success: false, message: "Regularization request not found" });
    }

    const cr = attendance.correctionRequests.id(id);
    if (!cr) {
      return res.status(404).json({ success: false, message: "Correction item not found" });
    }

    if (cr.status !== "Pending") {
      return res.status(400).json({ success: false, message: `Request is already ${cr.status}` });
    }

    const previousData = {
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      totalWorkingMinutes: attendance.totalWorkingMinutes,
      attendanceStatus: attendance.attendanceStatus,
    };

    // Apply corrected times
    if (cr.checkInTime) attendance.checkInTime = cr.checkInTime;
    if (cr.checkOutTime) attendance.checkOutTime = cr.checkOutTime;

    // Recalculate durations
    let grossMinutes = 0;
    if (attendance.checkInTime && attendance.checkOutTime) {
      grossMinutes = Math.max(0, Math.floor((new Date(attendance.checkOutTime) - new Date(attendance.checkInTime)) / 60000));
    }
    const totalBreakMin = attendance.totalBreakMinutes || 0;
    const netWorkingMin = Math.max(0, grossMinutes - totalBreakMin);

    attendance.totalWorkingMinutes = netWorkingMin;

    // Standard policy evaluation (8h = full, 4h = half day)
    if (netWorkingMin >= 480) {
      attendance.attendanceStatus = "Present";
      attendance.overtimeMinutes = Math.max(0, netWorkingMin - 480);
    } else if (netWorkingMin >= 240) {
      attendance.attendanceStatus = "Half Day";
      attendance.overtimeMinutes = 0;
    } else {
      attendance.attendanceStatus = "Present";
    }

    attendance.regularizationStatus = "Approved";

    // Mark correction request status
    cr.status = "Approved";
    cr.reviewedBy = adminId;
    cr.reviewedAt = new Date();
    cr.adminComment = comment || "";

    // Push timeline & audit
    attendance.timeline.push({
      eventType: "Correction Approved",
      timestamp: new Date(),
      description: `Regularization approved by ${req.user?.fullName || 'Admin'}. Net hours: ${(netWorkingMin / 60).toFixed(1)}h. Reason: ${cr.reason}`,
      source: "Admin System",
    });

    attendance.auditLogs.push({
      action: "Regularization Approved",
      updatedBy: adminId,
      adminName: req.user?.fullName || "Admin",
      reason: comment || cr.reason,
      previousData,
      newData: {
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        totalWorkingMinutes: attendance.totalWorkingMinutes,
        attendanceStatus: attendance.attendanceStatus,
      },
      timestamp: new Date(),
    });

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Regularization approved and attendance recalculated successfully.",
      attendance,
    });
  } catch (error) {
    console.error("Error in approveRegularizationAdmin:", error);
    return res.status(500).json({ success: false, message: "Failed to approve regularization", error: error.message });
  }
};

/**
 * @desc    Reject Regularization Request
 * @route   PUT /api/attendance/admin/regularizations/:id/reject
 * @access  Private (Admin)
 */
export const rejectRegularizationAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const adminId = req.user?._id;

    const attendance = await Attendance.findOne({ "correctionRequests._id": id }).populate("employee");
    if (!attendance) {
      return res.status(404).json({ success: false, message: "Regularization request not found" });
    }

    const cr = attendance.correctionRequests.id(id);
    if (!cr) {
      return res.status(404).json({ success: false, message: "Correction item not found" });
    }

    cr.status = "Rejected";
    cr.reviewedBy = adminId;
    cr.reviewedAt = new Date();
    cr.adminComment = comment || "Rejected by administrator";

    attendance.regularizationStatus = "Rejected";

    attendance.timeline.push({
      eventType: "Correction Rejected",
      timestamp: new Date(),
      description: `Regularization rejected by ${req.user?.fullName || 'Admin'}. Comment: ${comment || 'None'}`,
      source: "Admin System",
    });

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Regularization request rejected.",
      attendance,
    });
  } catch (error) {
    console.error("Error in rejectRegularizationAdmin:", error);
    return res.status(500).json({ success: false, message: "Failed to reject regularization", error: error.message });
  }
};

/**
 * @desc    Get All On-Duty Requests
 * @route   GET /api/attendance/admin/on-duty-requests
 * @access  Private (Admin / Manager)
 */
export const getAdminOnDutyRequests = async (req, res) => {
  try {
    const { status, department, search, page = 1, limit = 20 } = req.query;

    let query = {};
    if (status && status !== "All") query.status = status;

    if (department && department !== "All") {
      const emps = await Employee.find({ department }).select("_id");
      query.employee = { $in: emps.map((e) => e._id) };
    }

    if (search) {
      const emps = await Employee.find({
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { employeeId: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      query.employee = { $in: emps.map((e) => e._id) };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await OnDutyRequest.countDocuments(query);
    const requests = await OnDutyRequest.find(query)
      .populate("employee", "fullName employeeId department designation companyEmail")
      .populate("reviewedBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      requests,
    });
  } catch (error) {
    console.error("Error in getAdminOnDutyRequests:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch On-Duty requests", error: error.message });
  }
};

/**
 * @desc    Create On-Duty Request (Admin or Employee)
 * @route   POST /api/attendance/admin/on-duty-requests
 * @access  Private
 */
export const createAdminOnDutyRequest = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, duration, location, purpose, clientName, contactPerson } = req.body;

    const empId = employeeId || req.user?._id;
    if (!empId || !startDate || !endDate || !location || !purpose) {
      return res.status(400).json({ success: false, message: "Please provide employee, dates, location, and purpose" });
    }

    const onDuty = new OnDutyRequest({
      employee: empId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      duration: duration || "Single Day",
      location,
      purpose,
      clientName: clientName || "",
      contactPerson: contactPerson || "",
      status: req.user?.role === "Admin" ? "Approved" : "Pending",
      reviewedBy: req.user?.role === "Admin" ? req.user._id : null,
      reviewedAt: req.user?.role === "Admin" ? new Date() : null,
    });

    await onDuty.save();

    return res.status(201).json({
      success: true,
      message: "On-Duty request submitted successfully",
      onDuty,
    });
  } catch (error) {
    console.error("Error in createAdminOnDutyRequest:", error);
    return res.status(500).json({ success: false, message: "Failed to create On-Duty request", error: error.message });
  }
};

/**
 * @desc    Review On-Duty Request (Approve / Reject)
 * @route   PUT /api/attendance/admin/on-duty-requests/:id/review
 * @access  Private (Admin)
 */
export const reviewAdminOnDutyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;

    if (!["Approved", "Rejected", "Cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid review status" });
    }

    const onDuty = await OnDutyRequest.findById(id).populate("employee");
    if (!onDuty) {
      return res.status(404).json({ success: false, message: "On-Duty request not found" });
    }

    onDuty.status = status;
    onDuty.reviewedBy = req.user?._id;
    onDuty.reviewedAt = new Date();
    if (comments) onDuty.comments = comments;

    await onDuty.save();

    // If approved, update attendance record for matching date if present
    if (status === "Approved") {
      const dateStr = onDuty.startDate.toISOString().split("T")[0];
      const existingAtt = await Attendance.findOne({ employee: onDuty.employee?._id, date: dateStr });
      if (existingAtt) {
        existingAtt.locationMode = "On-Duty";
        existingAtt.attendanceStatus = "On-Duty";
        existingAtt.timeline.push({
          eventType: "On-Duty Approved",
          timestamp: new Date(),
          description: `On-Duty approved for location: ${onDuty.location}. Purpose: ${onDuty.purpose}`,
          source: "Admin System",
        });
        await existingAtt.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `On-Duty request ${status.toLowerCase()} successfully`,
      onDuty,
    });
  } catch (error) {
    console.error("Error in reviewAdminOnDutyRequest:", error);
    return res.status(500).json({ success: false, message: "Failed to review On-Duty request", error: error.message });
  }
};

/**
 * @desc    Get Attendance Exceptions
 * @route   GET /api/attendance/admin/exceptions
 * @access  Private (Admin / Manager)
 */
export const getAdminExceptions = async (req, res) => {
  try {
    const { status, severity, exceptionType, date, page = 1, limit = 20 } = req.query;

    let query = {};
    if (status && status !== "All") query.status = status;
    if (severity && severity !== "All") query.severity = severity;
    if (exceptionType && exceptionType !== "All") query.exceptionType = exceptionType;
    if (date) query.date = date;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await AttendanceException.countDocuments(query);
    const exceptions = await AttendanceException.find(query)
      .populate("employee", "fullName employeeId department designation companyEmail")
      .populate("attendance")
      .populate("resolvedBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      exceptions,
    });
  } catch (error) {
    console.error("Error in getAdminExceptions:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch attendance exceptions", error: error.message });
  }
};

/**
 * @desc    Update Attendance Exception Status (Resolve / Ignore)
 * @route   PUT /api/attendance/admin/exceptions/:id
 * @access  Private (Admin)
 */
export const updateAdminExceptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionNote } = req.body;

    if (!["Open", "Under Review", "Resolved", "Ignored"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const exception = await AttendanceException.findById(id).populate("employee");
    if (!exception) {
      return res.status(404).json({ success: false, message: "Exception not found" });
    }

    exception.status = status;
    if (status === "Resolved" || status === "Ignored") {
      exception.resolvedBy = req.user?._id;
      exception.resolvedAt = new Date();
    }
    if (resolutionNote) exception.resolutionNote = resolutionNote;

    await exception.save();

    return res.status(200).json({
      success: true,
      message: `Exception marked as ${status}`,
      exception,
    });
  } catch (error) {
    console.error("Error in updateAdminExceptionStatus:", error);
    return res.status(500).json({ success: false, message: "Failed to update exception status", error: error.message });
  }
};

/**
 * @desc    Run Automated Attendance Exception Detection Scan
 * @route   POST /api/attendance/admin/exceptions/detect
 * @access  Private (Admin)
 */
export const runAdminExceptionDetection = async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date || getTodayDateString();

    const employees = await Employee.find({ status: "Active" });
    const attendances = await Attendance.find({ date: targetDate }).populate("employee");

    const attMap = new Map();
    attendances.forEach((a) => {
      if (a.employee?._id) attMap.set(a.employee._id.toString(), a);
    });

    let detectedCount = 0;

    for (const emp of employees) {
      const att = attMap.get(emp._id.toString());

      // 1. Missing Check-In for active employee
      if (!att || !att.checkInTime) {
        try {
          await AttendanceException.findOneAndUpdate(
            { employee: emp._id, date: targetDate, exceptionType: "Missing Clock In" },
            {
              employee: emp._id,
              date: targetDate,
              exceptionType: "Missing Clock In",
              severity: "Medium",
              description: `Employee ${emp.fullName} has not clocked in for ${targetDate}.`,
              expectedValue: "Clock-In by 09:15 AM",
              detectedValue: "No punch",
              status: "Open",
            },
            { upsert: true, new: true }
          );
          detectedCount++;
        } catch {}
      } else {
        // 2. Unclosed Break
        const openBreak = (att.breaks || []).find((b) => !b.endTime);
        if (openBreak) {
          const breakMin = Math.floor((new Date() - new Date(openBreak.startTime)) / 60000);
          if (breakMin > 90) {
            try {
              await AttendanceException.findOneAndUpdate(
                { employee: emp._id, date: targetDate, exceptionType: "Unclosed Break" },
                {
                  employee: emp._id,
                  date: targetDate,
                  attendance: att._id,
                  exceptionType: "Unclosed Break",
                  severity: "High",
                  description: `Break '${openBreak.breakReason}' started at ${new Date(openBreak.startTime).toLocaleTimeString()} has been active for ${breakMin} mins without resume.`,
                  expectedValue: "Max 60 mins break",
                  detectedValue: `${breakMin} mins`,
                  status: "Open",
                },
                { upsert: true, new: true }
              );
              detectedCount++;
            } catch {}
          }
        }

        // 3. Late Arrival
        if (att.isLate || att.attendanceStatus === "Late Check-In") {
          try {
            await AttendanceException.findOneAndUpdate(
              { employee: emp._id, date: targetDate, exceptionType: "Late Arrival" },
              {
                employee: emp._id,
                date: targetDate,
                attendance: att._id,
                exceptionType: "Late Arrival",
                severity: "Low",
                description: `Late clock-in at ${att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString() : 'N/A'}.`,
                expectedValue: "09:00 AM",
                detectedValue: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString() : 'Late',
                status: "Open",
              },
              { upsert: true, new: true }
            );
            detectedCount++;
          } catch {}
        }

        // 4. Insufficient working hours on checked out day
        if (att.checkOutTime && (att.totalWorkingMinutes || 0) < 240) {
          try {
            await AttendanceException.findOneAndUpdate(
              { employee: emp._id, date: targetDate, exceptionType: "Insufficient Working Hours" },
              {
                employee: emp._id,
                date: targetDate,
                attendance: att._id,
                exceptionType: "Insufficient Working Hours",
                severity: "High",
                description: `Net working hours (${((att.totalWorkingMinutes || 0) / 60).toFixed(1)}h) fell below half-day threshold (4h).`,
                expectedValue: "Min 4.0 hrs",
                detectedValue: `${((att.totalWorkingMinutes || 0) / 60).toFixed(1)} hrs`,
                status: "Open",
              },
              { upsert: true, new: true }
            );
            detectedCount++;
          } catch {}
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Exception scan completed. ${detectedCount} potential items evaluated for ${targetDate}.`,
      detectedCount,
    });
  } catch (error) {
    console.error("Error in runAdminExceptionDetection:", error);
    return res.status(500).json({ success: false, message: "Exception detection failed", error: error.message });
  }
};

/**
 * @desc    Get Detailed Employee Attendance Profile (Admin View)
 * @route   GET /api/attendance/admin/employee-profile/:employeeId
 * @access  Private (Admin / Manager)
 */
export const getAdminEmployeeProfile = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;

    const targetYear = parseInt(year, 10) || new Date().getFullYear();

    const employee = await Employee.findById(employeeId).select(
      "fullName employeeId companyEmail department designation workLocation employmentType joiningDate status"
    );

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const records = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let wfhDays = 0;
    let onDutyDays = 0;
    let leaveDays = 0;
    let totalWorkingMinutes = 0;
    let totalOvertimeMinutes = 0;
    let lateArrivals = 0;
    let earlyCheckouts = 0;
    let regularizations = 0;

    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(targetYear, i, 1).toLocaleString("en-US", { month: "short" }),
      present: 0,
      absent: 0,
      wfh: 0,
      hours: 0,
      overtime: 0,
    }));

    records.forEach((r) => {
      const monthIdx = parseInt(r.date.split("-")[1], 10) - 1;
      const hours = (r.totalWorkingMinutes || 0) / 60;
      const ot = (r.overtimeMinutes || 0) / 60;

      totalWorkingMinutes += r.totalWorkingMinutes || 0;
      totalOvertimeMinutes += r.overtimeMinutes || 0;

      if (r.attendanceStatus === "Present") {
        presentDays++;
        if (monthIdx >= 0 && monthIdx < 12) monthlyBreakdown[monthIdx].present++;
      } else if (r.attendanceStatus === "Half Day") {
        halfDays++;
        presentDays += 0.5;
        if (monthIdx >= 0 && monthIdx < 12) monthlyBreakdown[monthIdx].present += 0.5;
      } else if (r.attendanceStatus === "Absent") {
        absentDays++;
        if (monthIdx >= 0 && monthIdx < 12) monthlyBreakdown[monthIdx].absent++;
      } else if (r.attendanceStatus === "On Leave") {
        leaveDays++;
      }

      if (r.locationMode === "WFH" || r.isRemote) {
        wfhDays++;
        if (monthIdx >= 0 && monthIdx < 12) monthlyBreakdown[monthIdx].wfh++;
      }
      if (r.locationMode === "On-Duty") onDutyDays++;

      if (r.isLate || r.attendanceStatus === "Late Check-In") lateArrivals++;
      if (r.isEarlyCheckout) earlyCheckouts++;
      if (r.regularizationStatus === "Approved") regularizations++;

      if (monthIdx >= 0 && monthIdx < 12) {
        monthlyBreakdown[monthIdx].hours += hours;
        monthlyBreakdown[monthIdx].overtime += ot;
      }
    });

    const totalDaysRecorded = records.length || 1;
    const attendancePercentage = Math.round((presentDays / totalDaysRecorded) * 100) || 0;
    const avgWorkingHours = presentDays > 0 ? (totalWorkingMinutes / 60 / presentDays).toFixed(1) : "0.0";

    return res.status(200).json({
      success: true,
      employee,
      stats: {
        year: targetYear,
        attendancePercentage,
        presentDays,
        absentDays,
        halfDays,
        wfhDays,
        onDutyDays,
        leaveDays,
        avgWorkingHours,
        totalOvertimeHours: (totalOvertimeMinutes / 60).toFixed(1),
        lateArrivals,
        earlyCheckouts,
        regularizations,
        totalRecordsCount: records.length,
      },
      monthlyBreakdown,
      recentRecords: records.slice(0, 30),
    });
  } catch (error) {
    console.error("Error in getAdminEmployeeProfile:", error);
    return res.status(500).json({ success: false, message: "Failed to load employee attendance profile", error: error.message });
  }
};

/**
 * @desc    Get Aggregated Reports Data for Export & Tables
 * @route   GET /api/attendance/admin/reports-data
 * @access  Private (Admin / Manager)
 */
export const getAdminReportsData = async (req, res) => {
  try {
    const { reportType = "attendance", startDate, endDate, department, employeeId } = req.query;

    const start = startDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const end = endDate || getTodayDateString();

    let empQuery = { status: "Active" };
    if (department && department !== "All") empQuery.department = department;
    if (employeeId && employeeId !== "All") empQuery._id = employeeId;

    const employees = await Employee.find(empQuery).select("fullName employeeId department designation companyEmail");
    const empIds = employees.map((e) => e._id);

    const records = await Attendance.find({
      date: { $gte: start, $lte: end },
      employee: { $in: empIds },
    })
      .populate("employee", "fullName employeeId department designation")
      .sort({ date: 1 });

    return res.status(200).json({
      success: true,
      reportType,
      dateRange: { start, end },
      totalEmployees: employees.length,
      recordsCount: records.length,
      records,
      employees,
    });
  } catch (error) {
    console.error("Error in getAdminReportsData:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reports data", error: error.message });
  }
};

/**
 * @desc    Get Payroll Attendance Summary
 * @route   GET /api/attendance/admin/payroll-summary
 * @access  Private (Admin)
 */
export const getAdminPayrollSummary = async (req, res) => {
  try {
    const { month, year, department, employeeId } = req.query;

    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const targetMonth = parseInt(month, 10) || new Date().getMonth() + 1;

    const monthStr = String(targetMonth).padStart(2, "0");
    const startDate = `${targetYear}-${monthStr}-01`;
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const endDate = `${targetYear}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;
    const periodName = `${new Date(targetYear, targetMonth - 1, 1).toLocaleString("en-US", { month: "long" })} ${targetYear}`;

    // Find if payroll period is finalized
    const payrollPeriod = await PayrollPeriod.findOne({ month: targetMonth, year: targetYear })
      .populate("finalizedBy", "fullName email")
      .populate("unlockedBy", "fullName email");

    let empQuery = { status: "Active" };
    if (department && department !== "All") empQuery.department = department;
    if (employeeId && employeeId !== "All") empQuery._id = employeeId;

    const employees = await Employee.find(empQuery).select(
      "fullName employeeId department designation companyEmail workLocation"
    );

    const empIds = employees.map((e) => e._id);

    const records = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
      employee: { $in: empIds },
    });

    const empRecordMap = new Map();
    records.forEach((r) => {
      const eid = r.employee.toString();
      if (!empRecordMap.has(eid)) empRecordMap.set(eid, []);
      empRecordMap.get(eid).push(r);
    });

    const summaryRows = employees.map((emp) => {
      const empRecs = empRecordMap.get(emp._id.toString()) || [];

      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let wfhDays = 0;
      let onDutyDays = 0;
      let totalWorkingMinutes = 0;
      let totalOvertimeMinutes = 0;
      let lateMarks = 0;
      let earlyCheckouts = 0;

      empRecs.forEach((r) => {
        totalWorkingMinutes += r.totalWorkingMinutes || 0;
        totalOvertimeMinutes += r.overtimeMinutes || 0;

        if (r.attendanceStatus === "Present") presentDays++;
        else if (r.attendanceStatus === "Half Day") halfDays++;
        else if (r.attendanceStatus === "Absent") absentDays++;
        else if (r.attendanceStatus === "On Leave") leaveDays++;

        if (r.locationMode === "WFH" || r.isRemote) wfhDays++;
        if (r.locationMode === "On-Duty") onDutyDays++;

        if (r.isLate || r.attendanceStatus === "Late Check-In") lateMarks++;
        if (r.isEarlyCheckout) earlyCheckouts++;
      });

      const effectivePayableDays = presentDays + halfDays * 0.5 + leaveDays + onDutyDays;

      return {
        employee: {
          _id: emp._id,
          fullName: emp.fullName,
          employeeId: emp.employeeId,
          department: emp.department,
          designation: emp.designation,
          email: emp.companyEmail,
        },
        workingDaysInMonth: daysInMonth,
        presentDays,
        halfDays,
        absentDays,
        leaveDays,
        wfhDays,
        onDutyDays,
        totalWorkingHours: (totalWorkingMinutes / 60).toFixed(1),
        overtimeHours: (totalOvertimeMinutes / 60).toFixed(1),
        lateMarks,
        earlyCheckouts,
        effectivePayableDays: effectivePayableDays.toFixed(1),
      };
    });

    return res.status(200).json({
      success: true,
      period: {
        periodName,
        month: targetMonth,
        year: targetYear,
        startDate,
        endDate,
        isFinalized: payrollPeriod ? payrollPeriod.isFinalized : false,
        finalizedAt: payrollPeriod?.finalizedAt,
        finalizedBy: payrollPeriod?.finalizedBy,
        unlockedAt: payrollPeriod?.unlockedAt,
        unlockedBy: payrollPeriod?.unlockedBy,
        unlockReason: payrollPeriod?.unlockReason,
      },
      summary: summaryRows,
    });
  } catch (error) {
    console.error("Error in getAdminPayrollSummary:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payroll summary", error: error.message });
  }
};

/**
 * @desc    Finalize Payroll Period (Locks attendance records)
 * @route   POST /api/attendance/admin/payroll-period/finalize
 * @access  Private (Admin)
 */
export const finalizePayrollPeriod = async (req, res) => {
  try {
    const { month, year, notes } = req.body;
    const adminId = req.user?._id;

    const targetMonth = parseInt(month, 10);
    const targetYear = parseInt(year, 10);

    const monthStr = String(targetMonth).padStart(2, "0");
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const endDate = new Date(targetYear, targetMonth - 1, daysInMonth);
    const periodName = `${startDate.toLocaleString("en-US", { month: "long" })} ${targetYear}`;

    let period = await PayrollPeriod.findOne({ month: targetMonth, year: targetYear });
    if (!period) {
      period = new PayrollPeriod({
        periodName,
        month: targetMonth,
        year: targetYear,
        startDate,
        endDate,
      });
    }

    period.isFinalized = true;
    period.finalizedBy = adminId;
    period.finalizedAt = new Date();
    period.notes = notes || "";
    await period.save();

    // Lock all attendance records in range
    const startStr = `${targetYear}-${monthStr}-01`;
    const endStr = `${targetYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

    const updateRes = await Attendance.updateMany(
      { date: { $gte: startStr, $lte: endStr } },
      {
        $set: { isPayrollFinalized: true, payrollPeriodId: period._id },
        $push: {
          timeline: {
            eventType: "Payroll Finalized",
            timestamp: new Date(),
            description: `Payroll period ${periodName} finalized by ${req.user?.fullName || 'Admin'}. Record locked from ordinary edits.`,
            source: "Admin System",
          },
        },
      }
    );

    await logSecurityAudit({
      action: "Payroll Finalized",
      performedBy: adminId,
      reason: `Finalized payroll period ${periodName} (${updateRes.modifiedCount} records locked)`,
      metadata: { periodName, month: targetMonth, year: targetYear, recordsLocked: updateRes.modifiedCount },
    });

    return res.status(200).json({
      success: true,
      message: `Payroll period ${periodName} finalized successfully. ${updateRes.modifiedCount} records locked.`,
      period,
    });
  } catch (error) {
    console.error("Error in finalizePayrollPeriod:", error);
    return res.status(500).json({ success: false, message: "Failed to finalize payroll period", error: error.message });
  }
};

/**
 * @desc    Unlock Payroll Period (Requires explicit reason)
 * @route   POST /api/attendance/admin/payroll-period/unlock
 * @access  Private (Admin)
 */
export const unlockPayrollPeriod = async (req, res) => {
  try {
    const { month, year, reason } = req.body;
    const adminId = req.user?._id;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ success: false, message: "An explicit justification reason is required to unlock finalized payroll." });
    }

    const targetMonth = parseInt(month, 10);
    const targetYear = parseInt(year, 10);
    const monthStr = String(targetMonth).padStart(2, "0");
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    const period = await PayrollPeriod.findOne({ month: targetMonth, year: targetYear });
    if (!period) {
      return res.status(404).json({ success: false, message: "Payroll period not found" });
    }

    period.isFinalized = false;
    period.unlockedBy = adminId;
    period.unlockedAt = new Date();
    period.unlockReason = reason;
    await period.save();

    const startStr = `${targetYear}-${monthStr}-01`;
    const endStr = `${targetYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

    await Attendance.updateMany(
      { date: { $gte: startStr, $lte: endStr } },
      {
        $set: { isPayrollFinalized: false },
        $push: {
          timeline: {
            eventType: "Payroll Unlocked",
            timestamp: new Date(),
            description: `Payroll period unlocked by ${req.user?.fullName || 'Admin'}. Reason: ${reason}`,
            source: "Admin System",
          },
        },
      }
    );

    await logSecurityAudit({
      action: "Payroll Unlocked",
      performedBy: adminId,
      reason: `Unlocked payroll period ${period.periodName}. Justification: ${reason}`,
      metadata: { periodName: period.periodName, month: targetMonth, year: targetYear },
    });

    return res.status(200).json({
      success: true,
      message: `Payroll period ${period.periodName} has been unlocked for modifications.`,
      period,
    });
  } catch (error) {
    console.error("Error in unlockPayrollPeriod:", error);
    return res.status(500).json({ success: false, message: "Failed to unlock payroll period", error: error.message });
  }
};

/**
 * @desc    Get Attendance Policy Rules & Shifts
 * @route   GET /api/attendance/admin/policies
 * @access  Private (Admin)
 */
export const getAdminPolicies = async (req, res) => {
  try {
    let policy = await AttendancePolicy.findOne({ companyId: "default_company" }).populate(
      "updatedBy",
      "fullName email"
    );

    if (!policy) {
      policy = new AttendancePolicy({
        companyId: "default_company",
        shifts: [
          {
            name: "General Shift",
            startTime: "09:00",
            endTime: "18:00",
            requiredWorkingHours: 8,
            halfDayThresholdHours: 4,
            gracePeriodMinutes: 15,
            overtimeThresholdMinutes: 30,
            maxBreakMinutes: 60,
            isDefault: true,
            isActive: true,
          },
          {
            name: "Morning Shift",
            startTime: "07:00",
            endTime: "16:00",
            requiredWorkingHours: 8,
            halfDayThresholdHours: 4,
            gracePeriodMinutes: 15,
            overtimeThresholdMinutes: 30,
            maxBreakMinutes: 60,
            isDefault: false,
            isActive: true,
          },
        ],
        enforceGeofence: true,
        enforceIpWhitelist: false,
        allowFlexibleWfh: true,
        defaultGeofenceRadiusMeters: 100,
        fullDayMinimumHours: 8,
        halfDayMinimumHours: 4,
        lateGraceMinutes: 15,
        earlyCheckoutGraceMinutes: 15,
        overtimeMinimumMinutes: 30,
        rules: {
          enableGeofencing: true,
          enableIpValidation: false,
          autoClockOutEnabled: true,
          autoClockOutTime: "23:59",
          requireBreakReason: true,
          maxDailyBreaks: 5,
          maxTotalBreakMinutes: 60,
          overtimeThresholdMinutes: 30,
        },
      });
      await policy.save();
    }

    const policyObj = policy.toObject();
    policyObj.rules = {
      ...(policyObj.rules || {}),
      enableGeofencing: policy.enforceGeofence,
      enableIpValidation: policy.enforceIpWhitelist,
    };

    return res.status(200).json({ success: true, policy: policyObj });
  } catch (error) {
    console.error("Error in getAdminPolicies:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch attendance policies", error: error.message });
  }
};

/**
 * @desc    Update Attendance Policies & Shifts
 * @route   PUT /api/attendance/admin/policies
 * @access  Private (Admin)
 */
export const updateAdminPolicies = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const updates = req.body;

    let policy = await AttendancePolicy.findOne({ companyId: "default_company" });
    if (!policy) {
      policy = new AttendancePolicy({ companyId: "default_company" });
    }

    Object.keys(updates).forEach((k) => {
      if (k !== "_id" && k !== "companyId") {
        policy[k] = updates[k];
      }
    });

    // Synchronize rules flags with top-level model fields
    if (updates.rules) {
      if (updates.rules.enableGeofencing !== undefined) {
        policy.enforceGeofence = !!updates.rules.enableGeofencing;
      }
      if (updates.rules.enableIpValidation !== undefined) {
        policy.enforceIpWhitelist = !!updates.rules.enableIpValidation;
      }
    }
    if (updates.enforceGeofence !== undefined) {
      policy.enforceGeofence = !!updates.enforceGeofence;
      if (!policy.rules) policy.rules = {};
      policy.rules.enableGeofencing = policy.enforceGeofence;
    }
    // Synchronize ipWhitelist array into IpWhitelist collection
    if (Array.isArray(updates.ipWhitelist)) {
      policy.ipWhitelist = updates.ipWhitelist;
      for (const item of updates.ipWhitelist) {
        if (item?.ip && item.ip.trim()) {
          const trimmedIp = item.ip.trim();
          const existing = await IpWhitelist.findOne({ ipAddress: trimmedIp });
          if (!existing) {
            await IpWhitelist.create({
              locationName: item.label || "Office Network",
              ipAddress: trimmedIp,
              scope: "Organization",
              type: "Permanent",
              status: "Active",
            });
          }
        }
      }
    }

    // Synchronize locations array into EmployeeLocation collection
    if (Array.isArray(updates.locations)) {
      policy.locations = updates.locations;
      for (const loc of updates.locations) {
        if (loc?.name && loc.latitude !== undefined && loc.longitude !== undefined) {
          const existing = await EmployeeLocation.findOne({
            locationName: loc.name,
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
          });
          if (!existing) {
            await EmployeeLocation.create({
              locationName: loc.name,
              latitude: Number(loc.latitude),
              longitude: Number(loc.longitude),
              radiusMeters: Number(loc.radiusMeters) || 100,
              isOrgWide: true,
              status: "Active",
              address: loc.address || "",
            });
          }
        }
      }
    }

    policy.updatedBy = adminId;
    await policy.save();

    await logSecurityAudit({
      action: "Updated Attendance Policy",
      performedBy: adminId,
      reason: `Updated organization policy rules (Enforce Geofence: ${policy.enforceGeofence}, Enforce IP: ${policy.enforceIpWhitelist})`,
    });

    const policyObj = policy.toObject();
    policyObj.rules = {
      ...(policyObj.rules || {}),
      enableGeofencing: policy.enforceGeofence,
      enableIpValidation: policy.enforceIpWhitelist,
    };

    return res.status(200).json({
      success: true,
      message: "Attendance policies updated successfully",
      policy: policyObj,
    });
  } catch (error) {
    console.error("Error in updateAdminPolicies:", error);
    return res.status(500).json({ success: false, message: "Failed to update attendance policies", error: error.message });
  }
};

/**
 * @desc    Get Comprehensive Traceable Attendance Audit Logs
 * @route   GET /api/attendance/admin/audit-logs
 * @access  Private (Admin)
 */
export const getAdminAuditLogs = async (req, res) => {
  try {
    const { action, employeeId, search, startDate, endDate, page = 1, limit = 50 } = req.query;

    let query = {};
    if (action && action !== "All") query.action = action;
    if (employeeId && employeeId !== "All") query.employee = employeeId;
    if (startDate && endDate) {
      query.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    if (search) {
      query.$or = [
        { action: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } },
        { ip: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await AttendanceSecurityAudit.countDocuments(query);
    const logs = await AttendanceSecurityAudit.find(query)
      .populate("performedBy", "fullName email role")
      .populate("employee", "fullName employeeId department designation")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      logs,
    });
  } catch (error) {
    console.error("Error in getAdminAuditLogs:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch audit logs", error: error.message });
  }
};

/**
 * @desc    Detect Current Admin Client IP & Network Information
 * @route   GET /api/attendance/admin/detect-network
 * @access  Private (Admin)
 */
export const detectCurrentNetworkInfo = async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    return res.status(200).json({
      success: true,
      clientIp: clientIp || "127.0.0.1",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error in detectCurrentNetworkInfo:", error);
    return res.status(500).json({ success: false, message: "Failed to detect network info", error: error.message });
  }
};

