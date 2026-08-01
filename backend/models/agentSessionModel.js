import mongoose from "mongoose";

const agentSessionSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    employeeId: {
      type: String,
      default: null,
    },
    deviceToken: {
      type: String,
      required: true,
      unique: true,
    },
    pairingToken: {
      type: String,
      default: null,
    },
    pairingTokenExpiresAt: {
      type: Date,
      default: null,
    },
    isPaired: {
      type: Boolean,
      default: false,
    },
    computerName: {
      type: String,
      default: "Unknown",
    },
    operatingSystem: {
      type: String,
      default: "Windows",
    },
    agentVersion: {
      type: String,
      default: "1.0.0",
    },
    currentStatus: {
      type: String,
      enum: ["Active", "Idle", "On Break", "Offline"],
      default: "Active",
    },
    idleTimeSeconds: {
      type: Number,
      default: 0,
    },
    lastHeartbeatAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const AgentSession = mongoose.model("AgentSession", agentSessionSchema);
export default AgentSession;
