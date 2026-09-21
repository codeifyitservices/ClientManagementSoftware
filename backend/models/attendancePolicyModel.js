import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  startTime: {
    type: String, // "09:00"
    default: "09:00",
  },
  endTime: {
    type: String, // "18:00"
    default: "18:00",
  },
  workingDays: {
    type: [String],
    default: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  requiredWorkingHours: {
    type: Number, // e.g., 8
    default: 8,
  },
  halfDayThresholdHours: {
    type: Number, // e.g., 4
    default: 4,
  },
  gracePeriodMinutes: {
    type: Number, // e.g., 15
    default: 15,
  },
  overtimeThresholdMinutes: {
    type: Number, // e.g., 30
    default: 30,
  },
  maxBreakMinutes: {
    type: Number, // e.g., 60
    default: 60,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const attendancePolicySchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      default: "default_company",
      unique: true,
    },
    shifts: [shiftSchema],
    enforceGeofence: {
      type: Boolean,
      default: true,
    },
    enforceIpWhitelist: {
      type: Boolean,
      default: false,
    },
    allowFlexibleWfh: {
      type: Boolean,
      default: true,
    },
    defaultGeofenceRadiusMeters: {
      type: Number,
      default: 100,
    },
    fullDayMinimumHours: {
      type: Number,
      default: 8,
    },
    halfDayMinimumHours: {
      type: Number,
      default: 4,
    },
    lateGraceMinutes: {
      type: Number,
      default: 15,
    },
    earlyCheckoutGraceMinutes: {
      type: Number,
      default: 15,
    },
    overtimeMinimumMinutes: {
      type: Number,
      default: 30,
    },
    autoDetectExceptions: {
      type: Boolean,
      default: true,
    },
    rules: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const AttendancePolicy = mongoose.models.AttendancePolicy || mongoose.model("AttendancePolicy", attendancePolicySchema);
export default AttendancePolicy;
