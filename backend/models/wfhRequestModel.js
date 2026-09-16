import mongoose from "mongoose";

const wfhRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: String,
      enum: ["24 Hours", "24 hrs", "1 Day", "3 Days", "3 days", "1 Week", "1 week", "Custom"],
      default: "24 hrs",
    },
    reason: {
      type: String,
      default: "",
    },
    requestIp: {
      type: String,
      default: "",
    },
    requestLatitude: {
      type: Number,
      default: null,
    },
    requestLongitude: {
      type: Number,
      default: null,
    },
    requestLocation: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    createdWhitelistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IpWhitelist",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const WfhRequest = mongoose.model("WfhRequest", wfhRequestSchema);
export default WfhRequest;
