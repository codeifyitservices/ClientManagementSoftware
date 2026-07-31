import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  service: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
    default: null,
  },
  status: {
    type: String,
    enum: ["Pending", "Invoiced", "Paid"],
    default: "Pending",
  },
});

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expectedEndDate: {
      type: Date,
      required: true,
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["Ongoing", "Completed"],
      default: "Ongoing",
    },
    assignedEmployees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        default: [],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);

export default Project;
