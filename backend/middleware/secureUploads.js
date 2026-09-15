import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
import Employee from "../models/employeeModel.js";

/**
 * Middleware / Controller for securely serving files from /uploads
 * - Prevents Directory Traversal
 * - Allows public access ONLY to non-sensitive branding assets (e.g., logo-*)
 * - Requires authentication for all other files
 * - Enforces RBAC ownership for sensitive employee documents (Aadhaar, PAN, Passports, empdoc-*)
 */
export const serveSecureUpload = async (req, res) => {
  try {
    const rawFilename = req.params.filename;
    if (!rawFilename) {
      return res.status(400).json({ message: "Filename is required" });
    }

    // Sanitize filename to strictly prevent path traversal
    const safeFilename = path.basename(rawFilename);
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const targetFilePath = path.resolve(uploadsDir, safeFilename);

    // Ensure the resolved path stays inside uploadsDir
    if (!targetFilePath.startsWith(uploadsDir)) {
      return res.status(403).json({ message: "Access forbidden" });
    }

    // Public assets: Company logos used across login & branding
    if (safeFilename.startsWith("logo-")) {
      if (!fs.existsSync(targetFilePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      return res.sendFile(targetFilePath);
    }

    // For all other files, authenticate request first to prevent enumeration
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication required to access this document." });
    }

    if (!fs.existsSync(targetFilePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server authentication error" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired session token." });
    }

    // Check if user is Admin
    const admin = await Admin.findById(decoded.id);
    if (admin) {
      return res.sendFile(targetFilePath);
    }

    // Check if user is Employee
    const employee = await Employee.findById(decoded.id);
    if (!employee) {
      return res.status(401).json({ message: "User account not found." });
    }

    // If it's an employee identity / HR document (empdoc-*)
    if (safeFilename.startsWith("empdoc-")) {
      const ownsDocument = employee.documents && employee.documents.some((d) => d.fileName === safeFilename);
      const isAvatar = employee.avatar === safeFilename;

      if (!ownsDocument && !isAvatar) {
        return res.status(403).json({
          message: "Access denied. You are not authorized to view identity documents of other employees.",
        });
      }
    }

    // For general operational attachments (tickets, tasks), authenticated employees are granted access
    return res.sendFile(targetFilePath);
  } catch (error) {
    console.error("Error serving upload:", error);
    return res.status(500).json({ message: "Error accessing file", error: error.message });
  }
};
