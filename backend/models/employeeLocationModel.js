import mongoose from "mongoose";

const employeeLocationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },
    locationName: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    radiusMeters: {
      type: Number,
      default: 200,
    },
    status: {
      type: String,
      enum: ["Active", "Disabled"],
      default: "Active",
      index: true,
    },
    isOrgWide: {
      type: Boolean,
      default: true,
      index: true,
    },
    address: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const EmployeeLocation = mongoose.model("EmployeeLocation", employeeLocationSchema);
export default EmployeeLocation;
