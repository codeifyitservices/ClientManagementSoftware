import mongoose from "mongoose";

const payrollPeriodSchema = new mongoose.Schema(
  {
    periodName: {
      type: String, // e.g., "September 2026", "2026-09"
      required: true,
      unique: true,
      trim: true,
    },
    month: {
      type: Number, // 1 - 12
      required: true,
    },
    year: {
      type: Number, // e.g. 2026
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isFinalized: {
      type: Boolean,
      default: false,
      index: true,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    unlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    unlockedAt: {
      type: Date,
      default: null,
    },
    unlockReason: {
      type: String,
      default: "",
    },
    totalEmployeesProcessed: {
      type: Number,
      default: 0,
    },
    totalPayableDays: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

payrollPeriodSchema.index({ month: 1, year: 1 }, { unique: true });

const PayrollPeriod = mongoose.models.PayrollPeriod || mongoose.model("PayrollPeriod", payrollPeriodSchema);
export default PayrollPeriod;
