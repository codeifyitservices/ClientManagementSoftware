import mongoose from "mongoose";

const attendanceSecurityAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },
    ip: {
      type: String,
      default: "",
      index: true,
    },
    location: {
      type: String,
      default: "",
    },
    reason: {
      type: String,
      default: "",
    },
    matchedRule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IpWhitelist",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const AttendanceSecurityAudit = mongoose.model(
  "AttendanceSecurityAudit",
  attendanceSecurityAuditSchema
);
export default AttendanceSecurityAudit;
