import mongoose from "mongoose";

const breakSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    default: null,
  },
  durationMinutes: {
    type: Number,
    default: 0,
  },
  breakReason: {
    type: String,
    default: "General Break",
  },
});

const timelineEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: [
      "Checked In",
      "Break Started",
      "Break Ended",
      "Became Idle",
      "Became Active",
      "Status Changed",
      "Checked Out",
      "Correction Submitted",
      "Correction Approved",
      "Manual Edit",
    ],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    default: "",
  },
  source: {
    type: String,
    enum: ["Web App", "Desktop Agent", "Admin System"],
    default: "Web App",
  },
});

const correctionRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  },
  checkInTime: {
    type: Date,
  },
  checkOutTime: {
    type: Date,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  },
  reviewedAt: {
    type: Date,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
});

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  },
  previousData: {
    type: mongoose.Schema.Types.Mixed,
  },
  newData: {
    type: mongoose.Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    employeeCustomId: {
      type: String,
      default: "",
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
      default: null,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    currentStatus: {
      type: String,
      enum: ["Not Checked In", "Checked In", "Working", "On Break", "Checked Out", "Offline", "Idle"],
      default: "Not Checked In",
    },
    attendanceStatus: {
      type: String,
      enum: ["Present", "Absent", "Half Day", "Late Check-In", "On Leave"],
      default: "Present",
    },
    isRemote: {
      type: Boolean,
      default: false,
    },
    breaks: [breakSchema],
    totalWorkingMinutes: {
      type: Number,
      default: 0,
    },
    totalBreakMinutes: {
      type: Number,
      default: 0,
    },
    totalIdleMinutes: {
      type: Number,
      default: 0,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    deviceId: {
      type: String,
      default: null,
    },
    deviceName: {
      type: String,
      default: null,
    },
    systemIdleSeconds: {
      type: Number,
      default: 0,
    },
    timeline: [timelineEventSchema],
    correctionRequests: [correctionRequestSchema],
    adminRemarks: {
      type: String,
      default: "",
    },
    auditLogs: [auditLogSchema],
  },
  {
    timestamps: true,
  }
);

// Ensure one attendance record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
