import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  invoiceNumber: {
    type: String,
    trim: true,
    default: "",
  },
  billingPeriod: {
    type: String,
    trim: true,
    default: "",
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    default: "bank_transfer",
  },
  referenceNo: {
    type: String,
    trim: true,
    default: "",
  },
  status: {
    type: String,
    enum: ["Paid", "Pending", "Failed"],
    default: "Paid",
  },
  notes: {
    type: String,
    trim: true,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  billingCycle: {
    type: String,
    enum: ["monthly", "one_time"],
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "removed"],
    default: "active",
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const subscriptionSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    customType: {
      type: String,
      default: "",
    },
    paymentMethod: {
      type: String,
      default: "bank_transfer",
    },
    currency: {
      type: String,
      default: "INR (₹)",
    },
    billingCycle: {
      type: String,
      default: "monthly",
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    renewalType: {
      type: String,
      default: "automatic",
    },
    planDetails: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    payments: {
      type: [paymentSchema],
      default: [],
    },
    services: {
      type: [serviceSchema],
      default: [],
    },
    startDate: {
      type: Date,
      required: true,
    },
    durationValue: {
      type: Number,
      required: true,
      min: 1,
    },
    durationUnit: {
      type: String,
      enum: ["months", "years"],
      required: true,
    },
    baseAmount: {
      type: Number,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
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
      required: true,
      min: 0,
    },
    endDate: {
      type: Date,
      required: true,
    },
    emailSent1Month: {
      type: Boolean,
      default: false,
    },
    emailSent15Days: {
      type: Boolean,
      default: false,
    },
    alertDismissed1Month: {
      type: Boolean,
      default: false,
    },
    alertDismissed15Days: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

subscriptionSchema.virtual("totalAmount").get(function () {
  const base = this.baseAmount ?? this.amount ?? 0;
  const addonSum = (this.services || [])
    .filter((s) => s.status === "active" && s.billingCycle === "monthly")
    .reduce((sum, s) => sum + (s.price || 0), 0);
  return base + addonSum;
});

subscriptionSchema.pre("validate", async function () {
  if (this.baseAmount === undefined && this.amount !== undefined) {
    this.baseAmount = this.amount;
  } else if (this.amount === undefined && this.baseAmount !== undefined) {
    this.amount = this.baseAmount;
  }

  if (this.startDate && this.durationValue && this.durationUnit) {
    const end = new Date(this.startDate);
    const val = Number(this.durationValue);
    
    if (this.durationUnit === "months") {
      end.setMonth(end.getMonth() + val);
    } else if (this.durationUnit === "years") {
      end.setFullYear(end.getFullYear() + val);
    }

    // Reset alert flags if start date or duration parameters changed
    if (this.isModified("startDate") || this.isModified("durationValue") || this.isModified("durationUnit")) {
      this.endDate = end;
      this.emailSent1Month = false;
      this.emailSent15Days = false;
      this.alertDismissed1Month = false;
      this.alertDismissed15Days = false;
    } else {
      this.endDate = end;
    }
  }

  const effectiveBase = this.baseAmount ?? this.amount ?? 0;

  if (effectiveBase !== undefined) {
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
        console.error("Error looking up client in subscription pre-validate:", err);
      }
    }

    if (isForeign || this.isPersonalAccount) {
      this.finalAmount = effectiveBase; // No GST for foreign or personal account clients
    } else if (this.inclusiveGst) {
      this.finalAmount = effectiveBase;
    } else {
      this.finalAmount = Math.round(effectiveBase * 1.18 * 100) / 100;
    }
  }
});

const Subscription = mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
