import mongoose from "mongoose";

const ipWhitelistSchema = new mongoose.Schema(
  {
    ipAddress: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    scope: {
      type: String,
      enum: ["Organization", "Employee"],
      default: "Organization",
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },
    locationName: {
      type: String,
      default: "Approved Network",
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    expiryType: {
      type: String,
      enum: ["1 Day", "1 Week", "1 Month", "24 Hours", "Custom", "Never"],
      default: "Never",
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["Active", "Disabled", "Expired"],
      default: "Active",
      index: true,
    },
    type: {
      type: String,
      enum: ["Permanent", "Temporary", "WFH"],
      default: "Permanent",
    },
    wfhRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WfhRequest",
      default: null,
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

const IpWhitelist = mongoose.model("IpWhitelist", ipWhitelistSchema);
export default IpWhitelist;
