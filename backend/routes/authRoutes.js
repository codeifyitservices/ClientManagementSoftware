import express from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
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

// 1. POST /api/auth/login - Admin Authentication
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter email and password." });
    }

    const admin = await Admin.findOne({ email });

    if (admin && (await admin.matchPassword(password))) {
      res.json({
        token: generateToken(admin._id),
        email: admin.email,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password." });
    }
  } catch (error) {
    res.status(500).json({ message: "Error during login process.", error: error.message });
  }
});

// 2. POST /api/auth/update-password - Change admin login password
router.post("/update-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please enter current and new passwords." });
    }

    // Retrieve admin document including hashed password
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ message: "Administrator profile not found." });
    }

    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    // Assigning raw text triggers the Mongoose 'pre-save' hook to bcrypt-hash it
    admin.password = newPassword;
    await admin.save();

    res.json({ message: "Administrator password updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error updating password.", error: error.message });
  }
});

export default router;
