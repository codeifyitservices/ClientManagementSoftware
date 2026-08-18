import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  serviceName: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  sacCode: {
    type: String,
    required: true,
    trim: true,
    default: "9983",
  },
  qty: {
    type: Number,
    default: 1,
  },
  rate: {
    type: Number,
    default: 0,
  },
  amount: {
    type: Number,
    default: 0,
  },
  gstRate: {
    type: Number,
    required: true,
    default: 18,
  },
  isInclusive: {
    type: Boolean,
    default: false,
  },
  originalAmount: {
    type: Number,
    default: 0,
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    invoiceType: {
      type: String,
      default: "Tax Invoice",
    },
    currency: {
      type: String,
      default: "INR (₹)",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    items: {
      type: [invoiceItemSchema],
      required: true,
      default: [],
    },
    serviceDescription: {
      type: String,
      default: "",
    },
    sacCode: {
      type: String,
      default: "9983",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    gstRate: {
      type: Number,
      required: true,
      default: 18,
    },
    gstAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },
    invoiceSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate taxes dynamically by summing all line items
invoiceSchema.pre("save", async function () {
  // Check if client is a foreign client
  let isForeign = false;
  if (this.client) {
    try {
      const Client = mongoose.model("Client");
      const clientObj = await Client.findById(this.client);
      if (clientObj && clientObj.isForeign) {
        isForeign = true;
      }
    } catch (err) {
      console.error("Error looking up client in invoice pre-save hook:", err);
    }
  }

  if (this.items && this.items.length > 0) {

    let baseSum = 0;
    let gstSum = 0;
    const descriptions = [];
    const sacCodes = [];

    this.items.forEach((item) => {
      // If client is foreign, force GST rate to 0
      const effectiveGstRate = isForeign ? 0 : (item.gstRate !== undefined && item.gstRate !== null ? item.gstRate : 18);
      item.gstRate = effectiveGstRate;

      let itemBase = 0;
      let itemGst = 0;

      if (item.isInclusive && item.originalAmount > 0) {
        // Calculate rounded base amount
        itemBase = Math.round(item.originalAmount / (1 + effectiveGstRate / 100));
        // GST is the difference to ensure total matches exactly
        itemGst = item.originalAmount - itemBase;
      } else {
        itemBase = Number(item.amount !== undefined && item.amount !== null && item.amount !== 0 ? item.amount : ((item.qty || 1) * (item.rate || 0))) || 0;
        itemGst = itemBase * (effectiveGstRate / 100);
      }

      itemBase = Math.round(itemBase * 100) / 100;
      itemGst = Math.round(itemGst * 100) / 100;

      item.amount = itemBase;
      item.rate = itemBase;
      item.qty = 1;
      
      baseSum += itemBase;
      gstSum += itemGst;
      
      descriptions.push(item.description);
      if (item.sacCode) sacCodes.push(item.sacCode);
    });

    this.amount = Number(baseSum.toFixed(2));
    this.gstAmount = Number(gstSum.toFixed(2));
    this.totalAmount = Number((baseSum + gstSum).toFixed(2));
    this.serviceDescription = descriptions.join(", ");
    this.sacCode = sacCodes.length > 0 ? sacCodes[0] : "9983";
    this.gstRate = this.items.length > 0 ? this.items[0].gstRate : (isForeign ? 0 : 18); // Default rate reference
  } else {
    // Fallback if no items provided
    const baseAmount = Number(this.amount) || 0;
    const rate = isForeign ? 0 : (Number(this.gstRate) || 0);
    this.gstRate = rate;
    this.gstAmount = Number((baseAmount * (rate / 100)).toFixed(2));
    this.totalAmount = Number((baseAmount + this.gstAmount).toFixed(2));
  }
});

invoiceSchema.post("save", async function (doc) {
  try {
    const Project = mongoose.model("Project");
    const milestoneStatus = doc.paymentStatus === "Paid" ? "Paid" : "Invoiced";
    console.log(`[Invoice Post-Save Hook] Invoice ${doc.invoiceNumber} (${doc._id}) saved. Status: ${doc.paymentStatus}. Updating linked milestones to: ${milestoneStatus}`);

    // Use arrayFilters to update ALL matching milestones (not just the first one)
    // The positional $ operator only updates the first match per document
    const updateResult = await Project.updateMany(
      { "milestones.invoice": doc._id },
      {
        $set: {
          "milestones.$[m].status": milestoneStatus
        }
      },
      {
        arrayFilters: [{ "m.invoice": doc._id }]
      }
    );
    console.log(`[Invoice Post-Save Hook] Update result: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`);
  } catch (err) {
    console.error("Error updating project milestone status on invoice save:", err);
  }
});

const Invoice = mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);

export default Invoice;
