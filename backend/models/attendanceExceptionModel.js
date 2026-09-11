import mongoose from "mongoose";

const attendanceExceptionSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      default: null,
    },
    exceptionType: {
      type: String,
      enum: [
        "Missing Clock In",
        "Missing Clock Out",
        "Duplicate Attendance",
        "Unclosed Break",
        "Excessive Break",
        "Late Arrival",
        "Early Checkout",
        "Insufficient Working Hours",
        "Geofence Violation",
        "IP Violation",
        "Unapproved WFH",
        "Excessive Overtime",
        "Suspicious Activity",
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["High", "Medium", "Low", "Info"],
      default: "Medium",
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    detectedValue: {
      type: String,
      default: "",
    },
    expectedValue: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Open", "Under Review", "Resolved", "Ignored"],
      default: "Open",
      index: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNote: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Unique index to prevent duplicate exception rows for the same employee + date + exceptionType
attendanceExceptionSchema.index({ employee: 1, date: 1, exceptionType: 1 }, { unique: true });

const AttendanceException = mongoose.models.AttendanceException || mongoose.model("AttendanceException", attendanceExceptionSchema);
export default AttendanceException;
