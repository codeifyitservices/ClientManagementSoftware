import mongoose from "mongoose";

const configSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      default: "ClientFlow Inc.",
      trim: true,
    },
    companyEmail: {
      type: String,
      required: true,
      default: "contact@clientflow.com",
      trim: true,
    },
    companyPhone: {
      type: String,
      required: true,
      default: "+91 98765 43210",
      trim: true,
    },
    companyAddress: {
      type: String,
      required: true,
      default: "123 Innovation Way, Tech Park, Bangalore, KA 560001",
      trim: true,
    },
    companyGst: {
      type: String,
      default: "29AAAAA0000A1Z5",
      trim: true,
    },
    invoiceTerms: {
      type: String,
      required: true,
      default: "Thank you for your business! Please pay within 15 days of invoice date.",
      trim: true,
    },
    companyLogo: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Config = mongoose.model("Config", configSchema);

export default Config;
