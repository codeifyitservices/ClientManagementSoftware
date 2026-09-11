import express from "express";
import protect from "../middleware/authMiddleware.js";
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
  // Upgraded Admin Attendance methods
  getAdminDashboard,
  getAdminLiveAttendance,
  getAdminRecords,
  getAdminCalendar,
  getAdminWfhRequests,
  bulkApproveWfhAdmin,
  getAdminRegularizations,
  approveRegularizationAdmin,
  rejectRegularizationAdmin,
  getAdminExceptions,
  updateAdminExceptionStatus,
  runAdminExceptionDetection,
  getAdminEmployeeProfile,
  getAdminReportsData,
  getAdminPayrollSummary,
  finalizePayrollPeriod,
  unlockPayrollPeriod,
  getAdminPolicies,
  updateAdminPolicies,
  getAdminAuditLogs,
  detectCurrentNetworkInfo,
} from "../controllers/attendanceController.js";

const router = express.Router();

// ── Employee / Shared Endpoints ──
router.get("/my-session", protect, getMyAttendanceSession);
router.post("/check-in", protect, checkIn);
router.post("/start-break", protect, startBreak);
router.post("/end-break", protect, endBreak);
router.post("/check-out", protect, checkOut);
router.get("/summary", protect, getTodaySummary);
router.get("/list", protect, getAttendanceList);
router.get("/details/:id", protect, getAttendanceDetails);
router.post("/manual", protect, manualUpsertAttendance);
router.post("/request-correction", protect, requestCorrection);
router.post("/approve-correction", protect, approveCorrection);
router.get("/reports", protect, getAttendanceReports);
router.post("/note", protect, saveAttendanceNote);
router.get("/security-status", protect, getEmployeeSecurityStatus);

// ── IP Whitelist & Locations ──
router.get("/whitelist", protect, getWhitelists);
router.post("/whitelist", protect, createWhitelist);
router.put("/whitelist/:id", protect, updateWhitelist);
router.delete("/whitelist/:id", protect, deleteWhitelist);

router.get("/locations", protect, getLocations);
router.post("/locations", protect, createLocation);
router.put("/locations/:id", protect, updateLocation);
router.delete("/locations/:id", protect, deleteLocation);

// ── Work From Home (WFH) Requests ──
router.get("/wfh-requests", protect, getWfhRequests);
router.post("/wfh-request", protect, createWfhRequest);
router.put("/wfh-requests/:id/approve", protect, approveWfhRequest);
router.put("/wfh-requests/:id/reject", protect, rejectWfhRequest);
router.get("/audit-logs", protect, getSecurityAuditLogs);

// ══════════════════════════════════════════════════════════════════════════════
// ── UPGRADED ADMIN ATTENDANCE ROUTES ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// Dashboard & Live View
router.get("/admin/dashboard", protect, getAdminDashboard);
router.get("/admin/live", protect, getAdminLiveAttendance);
router.get("/admin/records", protect, getAdminRecords);
router.get("/admin/calendar", protect, getAdminCalendar);

// WFH Requests Management
router.get("/admin/wfh-requests", protect, getAdminWfhRequests);
router.post("/admin/wfh-requests/bulk-approve", protect, bulkApproveWfhAdmin);

// Regularization Requests Management
router.get("/admin/regularizations", protect, getAdminRegularizations);
router.put("/admin/regularizations/:id/approve", protect, approveRegularizationAdmin);
router.put("/admin/regularizations/:id/reject", protect, rejectRegularizationAdmin);

// Attendance Exceptions
router.get("/admin/exceptions", protect, getAdminExceptions);
router.put("/admin/exceptions/:id", protect, updateAdminExceptionStatus);
router.post("/admin/exceptions/detect", protect, runAdminExceptionDetection);

// Employee Attendance Profile
router.get("/admin/employee-profile/:employeeId", protect, getAdminEmployeeProfile);

// Reports & Data Export
router.get("/admin/reports-data", protect, getAdminReportsData);

// Payroll Summary & Locks
router.get("/admin/payroll-summary", protect, getAdminPayrollSummary);
router.post("/admin/payroll-period/finalize", protect, finalizePayrollPeriod);
router.post("/admin/payroll-period/unlock", protect, unlockPayrollPeriod);

// Attendance Policies & Configuration
router.get("/admin/policies", protect, getAdminPolicies);
router.put("/admin/policies", protect, updateAdminPolicies);
router.get("/admin/detect-network", protect, detectCurrentNetworkInfo);

// Traceable Audit Logs
router.get("/admin/audit-logs", protect, getAdminAuditLogs);

export default router;
