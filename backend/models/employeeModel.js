import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const documentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: false,
    },
  },
  { _id: true }
);

const noteSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const timelineSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    companyEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Intern", "Contract"],
      default: "Full-time",
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    workLocation: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    personalEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    dob: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", ""],
      default: "",
    },
    bloodGroup: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    aadhaarNumber: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
    },
    passportNumber: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "Employee"],
      default: "Employee",
    },
    permissions: {
      type: [String],
      default: [
        "View Employees",
        "View Documents",
        "Upload Documents"
      ],
    },
    documents: [documentSchema],
    notes: [noteSchema],
    timeline: [timelineSchema],
  },
  {
    timestamps: true,
  }
);

// Hash the password pre-save if modified
employeeSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Auto-generate employeeId if not exists
  if (this.isNew && !this.employeeId) {
    try {
      const lastEmployee = await this.constructor.findOne(
        { employeeId: /^EMP-\d{4}$/ },
        {},
        { sort: { employeeId: -1 } }
      );
      let nextNumber = 1;
      if (lastEmployee && lastEmployee.employeeId) {
        const parts = lastEmployee.employeeId.split("-");
        const lastNum = parseInt(parts[1], 10);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
      this.employeeId = `EMP-${String(nextNumber).padStart(4, "0")}`;
    } catch (err) {
      console.error("Error auto-generating Employee ID:", err.message);
      this.employeeId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }
});

// Compare input password to hashed password in database
employeeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Employee = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

export default Employee;
