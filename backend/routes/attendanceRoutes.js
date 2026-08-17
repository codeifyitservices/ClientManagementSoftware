import express from "express";
import {
  checkIn,
  startBreak,
  endBreak,
  checkOut,
  getTodaySummary,
  getAttendanceList,
  getAttendanceDetails,
  manualUpsertAttendance,
  requestCorrection,
  approveCorrection,
  getAttendanceReports,
  getMyAttendanceSession,
  saveAttendanceNote,
  getEmployeeSecurityStatus,
  getWhitelists,
  createWhitelist,
  updateWhitelist,
  deleteWhitelist,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  createWfhRequest,
  getWfhRequests,
  approveWfhRequest,
  rejectWfhRequest,
  getSecurityAuditLogs,
} from "../controllers/attendanceController.js";

const router = express.Router();

router.get("/my-session", getMyAttendanceSession);
router.post("/check-in", checkIn);
router.post("/start-break", startBreak);
router.post("/end-break", endBreak);
router.post("/check-out", checkOut);
router.get("/summary", getTodaySummary);
router.get("/list", getAttendanceList);
router.get("/details/:id", getAttendanceDetails);
router.post("/manual", manualUpsertAttendance);
router.post("/request-correction", requestCorrection);
router.post("/approve-correction", approveCorrection);
router.get("/reports", getAttendanceReports);
router.post("/note", saveAttendanceNote);

// ── Attendance Security & Whitelisting Routes ──
router.get("/security-status", getEmployeeSecurityStatus);

// IP Whitelist
router.get("/whitelist", getWhitelists);
router.post("/whitelist", createWhitelist);
router.put("/whitelist/:id", updateWhitelist);
router.delete("/whitelist/:id", deleteWhitelist);

// Office / Geolocation Locations
router.get("/locations", getLocations);
router.post("/locations", createLocation);
router.put("/locations/:id", updateLocation);
router.delete("/locations/:id", deleteLocation);

// Work From Home (WFH) Requests
router.get("/wfh-requests", getWfhRequests);
router.post("/wfh-request", createWfhRequest);
router.put("/wfh-requests/:id/approve", approveWfhRequest);
router.put("/wfh-requests/:id/reject", rejectWfhRequest);

// Security Audit Logs
router.get("/audit-logs", getSecurityAuditLogs);

export default router;
