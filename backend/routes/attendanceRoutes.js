import express from "express";
import protect from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminOnly.js";
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
router.post("/manual", protect, adminOnly, manualUpsertAttendance);
router.post("/request-correction", protect, requestCorrection);
router.post("/approve-correction", protect, adminOnly, approveCorrection);
router.get("/reports", protect, getAttendanceReports);
router.post("/note", protect, saveAttendanceNote);
router.get("/security-status", protect, getEmployeeSecurityStatus);

// ── IP Whitelist & Locations (Admin managed) ──
router.get("/whitelist", protect, adminOnly, getWhitelists);
router.post("/whitelist", protect, adminOnly, createWhitelist);
router.put("/whitelist/:id", protect, adminOnly, updateWhitelist);
router.delete("/whitelist/:id", protect, adminOnly, deleteWhitelist);

router.get("/locations", protect, adminOnly, getLocations);
router.post("/locations", protect, adminOnly, createLocation);
router.put("/locations/:id", protect, adminOnly, updateLocation);
router.delete("/locations/:id", protect, adminOnly, deleteLocation);

// ── Work From Home (WFH) Requests ──
router.get("/wfh-requests", protect, getWfhRequests);
router.post("/wfh-request", protect, createWfhRequest);
router.put("/wfh-requests/:id/approve", protect, adminOnly, approveWfhRequest);
router.put("/wfh-requests/:id/reject", protect, adminOnly, rejectWfhRequest);
router.get("/audit-logs", protect, adminOnly, getSecurityAuditLogs);

// ══════════════════════════════════════════════════════════════════════════════
// ── UPGRADED ADMIN ATTENDANCE ROUTES ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// Dashboard & Live View
router.get("/admin/dashboard", protect, adminOnly, getAdminDashboard);
router.get("/admin/live", protect, adminOnly, getAdminLiveAttendance);
router.get("/admin/records", protect, adminOnly, getAdminRecords);
router.get("/admin/calendar", protect, adminOnly, getAdminCalendar);

// WFH Requests Management
router.get("/admin/wfh-requests", protect, adminOnly, getAdminWfhRequests);
router.post("/admin/wfh-requests/bulk-approve", protect, adminOnly, bulkApproveWfhAdmin);

// Regularization Requests Management
router.get("/admin/regularizations", protect, adminOnly, getAdminRegularizations);
router.put("/admin/regularizations/:id/approve", protect, adminOnly, approveRegularizationAdmin);
router.put("/admin/regularizations/:id/reject", protect, adminOnly, rejectRegularizationAdmin);

// Attendance Exceptions
router.get("/admin/exceptions", protect, adminOnly, getAdminExceptions);
router.put("/admin/exceptions/:id", protect, adminOnly, updateAdminExceptionStatus);
router.post("/admin/exceptions/detect", protect, adminOnly, runAdminExceptionDetection);

// Employee Attendance Profile
router.get("/admin/employee-profile/:employeeId", protect, adminOnly, getAdminEmployeeProfile);

// Reports & Data Export
router.get("/admin/reports-data", protect, adminOnly, getAdminReportsData);

// Payroll Summary & Locks
router.get("/admin/payroll-summary", protect, adminOnly, getAdminPayrollSummary);
router.post("/admin/payroll-period/finalize", protect, adminOnly, finalizePayrollPeriod);
router.post("/admin/payroll-period/unlock", protect, adminOnly, unlockPayrollPeriod);

// Attendance Policies & Configuration
router.get("/admin/policies", protect, adminOnly, getAdminPolicies);
router.put("/admin/policies", protect, adminOnly, updateAdminPolicies);
router.get("/admin/detect-network", protect, adminOnly, detectCurrentNetworkInfo);

// Traceable Audit Logs
router.get("/admin/audit-logs", protect, adminOnly, getAdminAuditLogs);

export default router;
