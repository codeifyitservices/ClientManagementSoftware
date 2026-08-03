import Attendance from "../models/attendanceModel.js";
import Employee from "../models/employeeModel.js";
import AgentSession from "../models/agentSessionModel.js";

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
 * @desc    Employee Check-In
 * @route   POST /api/attendance/check-in
 * @access  Private (Employee / Admin)
 */
export const checkIn = async (req, res) => {
  try {
    const employeeId = req.user?._id || req.body.employeeId;
    const { isRemote, deviceId, deviceName } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Verify desktop agent is connected for Employee check-in
    if (req.user?.role === "Employee") {
      const agentSession = await AgentSession.findOne({
        $or: [
          { employeeId: employee.employeeId },
          { employeeId: employee._id.toString() }
        ]
      }).sort({ lastHeartbeatAt: -1 });
      const isAgentConnected = !!(agentSession && agentSession.isPaired && (Date.now() - new Date(agentSession.lastHeartbeatAt).getTime() < 180000));
      if (!isAgentConnected) {
        return res.status(400).json({
          success: false,
          message: "Cannot check in: Desktop agent is not running or connected. Please launch the desktop agent first."
        });
      }
    }

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
    // Determine if late check-in (e.g. after 09:30 AM)
    const checkInHour = now.getHours();
    const checkInMin = now.getMinutes();
    const isLate = checkInHour > 9 || (checkInHour === 9 && checkInMin > 30);
    const attendanceStatus = isLate ? "Late Check-In" : "Present";

    const initialTimeline = [
      {
        eventType: "Checked In",
        timestamp: now,
        description: `Checked in successfully${isRemote ? " (Remote)" : ""}`,
        source: req.body.source || "Web App",
      },
    ];

    if (attendance) {
      attendance.checkInTime = now;
      attendance.currentStatus = "Working";
      attendance.attendanceStatus = attendanceStatus;
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
        isRemote: !!isRemote,
        deviceId: deviceId || null,
        deviceName: deviceName || null,
        lastActivityAt: now,
        timeline: initialTimeline,
      });
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
    const employeeId = req.user?._id || req.body.employeeId;
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
    const employeeId = req.user?._id || req.body.employeeId;
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
    const employeeId = req.user?._id || req.body.employeeId;
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
    const threeMinsAgo = new Date(Date.now() - 180000);
    const staleRecords = await Attendance.find({
      date: todayStr,
      currentStatus: "Working",
      deviceId: { $exists: true, $ne: null },
      lastActivityAt: { $exists: true, $ne: null, $lt: threeMinsAgo },
    });

    for (const record of staleRecords) {
      record.currentStatus = "Idle";
      record.timeline.push({
        eventType: "Became Idle",
        timestamp: new Date(),
        description: "Desktop agent disconnected / inactive for over 3 minutes",
        source: "Desktop Agent",
      });
      await record.save();
    }
  } catch (err) {
    console.error("Error checking stale agent sessions:", err);
  }
};

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
    const agentSession = await AgentSession.findOne({
      $or: [
        { employeeId: req.user.employeeId },
        { employeeId: req.user._id.toString() }
      ]
    }).sort({ lastHeartbeatAt: -1 });
    
    // Connected if paired and has had a heartbeat in the last 3 minutes (180,000 ms)
    const isAgentConnected = !!(agentSession && agentSession.isPaired && (Date.now() - new Date(agentSession.lastHeartbeatAt).getTime() < 180000));
    
    // If agent is connected, ensure status is "Working" immediately (override idle/inactive)
    if (isAgentConnected && attendance && attendance.currentStatus !== "Working" && attendance.currentStatus !== "Checked Out" && attendance.currentStatus !== "On Break") {
      if (attendance.currentStatus === "Idle") {
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
    const agentDeviceName = agentSession ? agentSession.computerName : null;

    return res.status(200).json({
      success: true,
      currentStatus: attendance?.currentStatus || "Not Checked In",
      attendance,
      isAgentConnected,
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
        ],
      });
    }

    if (!employee) return;

    let attendance = await Attendance.findOne({ employee: employee._id, date: todayStr });
    if (!attendance) return; // Attendance starts only after explicit check-in

    if (attendance.currentStatus === "Checked Out") return;

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

    // Map Desktop Agent Status -> Attendance Status rules
    const lastBreak = attendance.breaks[attendance.breaks.length - 1];
    const isBreakClosedOnServer = lastBreak && lastBreak.endTime;

    if (status === "On Break" && isBreakClosedOnServer) {
      // User must have resumed work from the Web App, force Agent back to Working!
      if (attendance.currentStatus !== "Working") {
        attendance.currentStatus = "Working";
        await attendance.save();
      }
      return { serverStatus: "Working" };
    }

    if ((status === "Active" || status === "Working") && oldStatus === "On Break") {
      // User resumed work from the Desktop Agent: close the break in the database
      if (lastBreak && !lastBreak.endTime) {
        lastBreak.endTime = new Date();
        lastBreak.durationMinutes = Math.max(1, Math.round((lastBreak.endTime - lastBreak.startTime) / 60000));
        attendance.totalBreakMinutes += lastBreak.durationMinutes;
      }
      attendance.currentStatus = "Working";
      attendance.timeline.push({
        eventType: "Break Ended",
        timestamp: new Date(),
        description: "Status changed to Working via Desktop Agent",
        source: "Desktop Agent",
      });
      await attendance.save();
      return { serverStatus: "Working" };
    }

    if (oldStatus === "On Break") {
      // Keep "On Break" status if break is still open
      return { serverStatus: "On Break" };
    }

    if (status === "On Break" && oldStatus !== "On Break") {
      attendance.currentStatus = "On Break";
      attendance.breaks.push({
        startTime: new Date(),
        breakReason: "General Break (Agent)",
      });
      attendance.timeline.push({
        eventType: "Break Started",
        timestamp: new Date(),
        description: "Status changed to On Break via Desktop Agent",
        source: "Desktop Agent",
      });
    } else if (status === "Idle") {
      if (oldStatus !== "Idle") {
        attendance.currentStatus = "Idle";
        const initialIdleMins = Math.round((idleTimeSeconds || 0) / 60);
        attendance.timeline.push({
          eventType: "Became Idle",
          timestamp: new Date(),
          description: `System idle for ${initialIdleMins} minutes`,
          source: "Desktop Agent",
        });
      }
    } else if (status === "Offline" || status === "Disconnected") {
      if (oldStatus === "Idle") {
        const elapsedMins = (Date.now() - new Date(oldLastActivityAt).getTime()) / 60000;
        attendance.totalIdleMinutes = (attendance.totalIdleMinutes || 0) + elapsedMins;
      }
      attendance.currentStatus = "Idle";
      attendance.timeline.push({
        eventType: "Became Idle",
        timestamp: new Date(),
        description: "Desktop agent disconnected / offline",
        source: "Desktop Agent",
      });
    } else if (status === "Active" || status === "Working") {
      if (oldStatus !== "Working") {
        if (oldStatus === "Idle") {
          const elapsedMins = (Date.now() - new Date(oldLastActivityAt).getTime()) / 60000;
          attendance.totalIdleMinutes = (attendance.totalIdleMinutes || 0) + elapsedMins;
        }
        attendance.timeline.push({
          eventType: "Became Active",
          timestamp: new Date(),
          description: "User resumed active desktop work",
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
      const agentSession = await AgentSession.findOne({
        $or: [
          { employeeId: req.user.employeeId },
          { employeeId: req.user._id.toString() }
        ]
      }).sort({ lastHeartbeatAt: -1 });
      const isAgentConnected = !!(agentSession && agentSession.isPaired && (Date.now() - new Date(agentSession.lastHeartbeatAt).getTime() < 180000));

      // If agent is connected, ensure status is "Working" immediately (override idle/inactive)
      if (isAgentConnected && myRecord && myRecord.currentStatus !== "Working" && myRecord.currentStatus !== "Checked Out" && myRecord.currentStatus !== "On Break") {
        if (myRecord.currentStatus === "Idle") {
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

      const startOfMonth = new Date(targetDate);
      startOfMonth.setDate(1);
      const startOfMonthStr = getTodayDateString(startOfMonth);

      const monthRecords = await Attendance.find({
        employee: userId,
        date: { $gte: startOfMonthStr, $lte: targetDate },
      });

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
      });

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
    const employeeId = req.user?._id || req.body.employeeId;
    const { attendanceId, date, checkInTime, checkOutTime, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: "Reason for correction is required" });
    }

    let attendance = null;
    if (attendanceId && !attendanceId.startsWith("virtual-")) {
      attendance = await Attendance.findById(attendanceId);
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
