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
  invoices: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
  ],
  invoicedAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ["Pending", "Partially Invoiced", "Invoiced", "Partially Paid", "Paid"],
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

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: [
      "Software / Tools",
      "Server / Hosting",
      "Subcontractor / Freelancer",
      "Marketing / Ads",
      "Travel / Logistics",
      "Assets / Design",
      "Other",
    ],
    default: "Other",
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  paidBy: {
    type: String,
    default: "Company Account",
  },
  notes: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const commissionSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: ["Percentage", "Fixed Amount"],
    default: "Percentage",
  },
  basis: {
    type: String,
    enum: ["Revenue", "Profit"],
    default: "Revenue",
  },
  rate: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ["Pending", "Paid"],
    default: "Pending",
  },
  paidDate: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: "",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
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
    expenses: {
      type: [expenseSchema],
      default: [],
    },
    commission: {
      type: commissionSchema,
      default: () => ({
        enabled: false,
        type: "Percentage",
        basis: "Revenue",
        rate: 0,
        status: "Pending",
        paidDate: null,
        notes: "",
      }),
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.pre("validate", async function () {
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

  if (this.projectValue !== undefined) {
    if (isForeign || this.isPersonalAccount) {
      this.finalAmount = this.projectValue; // No GST for foreign or personal account clients
    } else if (this.inclusiveGst) {
      this.finalAmount = this.projectValue;
    } else {
      this.finalAmount = Math.round(this.projectValue * 1.18 * 100) / 100;
    }
  }

  // Validate that the sum of milestone total amounts does not exceed finalAmount
  if (this.milestones && this.milestones.length > 0) {
    const sumTotal = this.milestones.reduce((acc, m) => {
      const isTaxExempt = isForeign || this.isPersonalAccount || !!m.isPersonal;
      if (isTaxExempt) return acc + (Number(m.amount) || 0);
      if (m.isInclusive) return acc + (Number(m.amount) || 0);
      return acc + Math.round((Number(m.amount) || 0) * 1.18 * 100) / 100;
    }, 0);

    // Allow for a tiny 0.05 margin of error to prevent floating point issues
    if (sumTotal > (this.finalAmount || 0) + 0.05) {
      this.invalidate(
        "milestones",
        `The sum of payment milestones with GST (₹${sumTotal.toLocaleString("en-IN")}) cannot exceed the final project value (₹${(this.finalAmount || 0).toLocaleString("en-IN")}).`
      );
    }
  }
});

const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);

export default Project;
