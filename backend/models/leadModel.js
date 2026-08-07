import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    default: "",
  },
});

const stageUpdateSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "On Hold", "Cancelled"],
      default: "Pending",
      required: true,
    },
    temperature: {
      type: String,
      enum: ["Cold", "Warm", "Hot", "Critical", "Closing Soon"],
      default: "Cold",
      required: true,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    nextFollowUp: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      required: true,
      trim: true,
    },
    dealValue: {
      type: Number,
      default: null,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const activitySchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    default: "system",
  },
});

const leadSchema = new mongoose.Schema(
  {
    leadName: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      trim: true,
      default: "Website",
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    // Caching state fields for fast querying, filtering & backward-compatibility
    currentStage: {
      type: String,
      default: "New Lead",
    },
    currentStatus: {
      type: String,
      default: "Pending",
    },
    currentTemperature: {
      type: String,
      default: "Cold",
    },
    currentNextFollowUpDate: {
      type: Date,
      default: null,
    },
    leadJourney: {
      type: [stageUpdateSchema],
      default: [],
    },
    activities: {
      type: [activitySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);

export default Lead;
