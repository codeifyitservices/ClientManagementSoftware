import express from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
import Employee from "../models/employeeModel.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Generate a signed JWT token valid for 30 days
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || "clientflow_secret_token_signature_key_2026",
    { expiresIn: "30d" }
  );
};

// 1. POST /api/auth/login - User Authentication (Admin & Employee)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter email and password." });
    }

    // Try finding in Admin collection first
    let user = await Admin.findOne({ email: email.toLowerCase() });
    let isEmployee = false;

    if (!user) {
      // Find in Employee collection
      user = await Employee.findOne({ companyEmail: email.toLowerCase() });
      isEmployee = true;
    }

    if (user && (await user.matchPassword(password))) {
      if (isEmployee && user.status === "Inactive") {
        return res.status(403).json({ message: "Your account is inactive. Please contact your manager." });
      }

      res.json({
        _id: user._id,
        token: generateToken(user._id),
        email: isEmployee ? user.companyEmail : user.email,
        role: isEmployee ? user.role : "Admin",
        permissions: isEmployee ? user.permissions : [
          "View Employees",
          "Create Employees",
          "Edit Employees",
          "Delete Employees",
          "View Documents",
          "Upload Documents",
          "Delete Documents",
          "Manage Roles"
        ],
        fullName: isEmployee ? user.fullName : "System Admin",
      });
    } else {
      res.status(401).json({ message: "Invalid email or password." });
    }
  } catch (error) {
    res.status(500).json({ message: "Error during login process.", error: error.message });
  }
});

// 2. POST /api/auth/update-password - Change current user password
router.post("/update-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please enter current and new passwords." });
    }

    let user;
    if (req.user.role === "Admin") {
      user = await Admin.findById(req.user._id);
    } else {
      user = await Employee.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).json({ message: "Account profile not found." });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error updating password.", error: error.message });
  }
});

export default router;
