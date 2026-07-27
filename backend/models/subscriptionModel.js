import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    type: {
      type: String,
      enum: ["hosting", "maintenance"],
      required: true,
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    inclusiveGst: {
      type: Boolean,
      default: true,
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
  }
);

subscriptionSchema.pre("validate", function () {
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

  if (this.amount !== undefined) {
    if (this.inclusiveGst) {
      this.finalAmount = this.amount;
    } else {
      this.finalAmount = Math.round(this.amount * 1.18 * 100) / 100;
    }
  }
});

const Subscription = mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
