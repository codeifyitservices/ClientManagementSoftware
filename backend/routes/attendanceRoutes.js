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

export default router;
