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
  isInclusive: {
    type: Boolean,
    default: false,
  },
  isPersonal: {
    type: Boolean,
    default: false,
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
    projectValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR (₹)",
    },
    inclusiveGst: {
      type: Boolean,
      default: true,
    },
    isPersonalAccount: {
      type: Boolean,
      default: false,
    },
    finalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.pre("validate", async function () {
  if (this.projectValue !== undefined) {
    // Check if the client is foreign
    let isForeign = false;
    if (this.client) {
      try {
        const Client = mongoose.model("Client");
        const clientObj = await Client.findById(this.client);
        if (clientObj && clientObj.isForeign) {
          isForeign = true;
        }
      } catch (err) {
        console.error("Error looking up client in project pre-validate:", err);
      }
    }

    if (isForeign || this.isPersonalAccount) {
      this.finalAmount = this.projectValue; // No GST for foreign or personal account clients
    } else if (this.inclusiveGst) {
      this.finalAmount = this.projectValue;
    } else {
      this.finalAmount = Math.round(this.projectValue * 1.18 * 100) / 100;
    }
  }

  // Validate that the sum of milestone amounts does not exceed finalAmount
  if (this.milestones && this.milestones.length > 0) {
    const sum = this.milestones.reduce((acc, m) => acc + (m.amount || 0), 0);
    // Allow for a tiny 0.05 margin of error to prevent floating point issues
    if (sum > this.finalAmount + 0.05) {
      this.invalidate(
        "milestones",
        `The sum of payment milestones (₹${sum.toLocaleString("en-IN")}) cannot exceed the final project value (₹${this.finalAmount.toLocaleString("en-IN")}).`
      );
    }
  }
});

const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);

export default Project;
