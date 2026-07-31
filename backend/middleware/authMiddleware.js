import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
import Employee from "../models/employeeModel.js";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {

      // Verify the JWT token signature
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "clientflow_secret_token_signature_key_2026"
      );

      // Find the associated profile
      let user = await Admin.findById(decoded.id).select("-password");
      let isEmployee = false;

      if (!user) {
        user = await Employee.findById(decoded.id).select("-password");
        isEmployee = true;
      }
      
      if (!user) {
        return res.status(401).json({ message: "Account profile not found." });
      }

      req.user = {
        _id: user._id,
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
      };

      req.admin = user; // Maintain compatibility
      
      next();
    } catch (error) {
      console.error("JWT token verification error:", error.message);
      return res.status(401).json({
        message: "Not authorized, token validation failed or expired.",
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      message: "Not authorized, authorization bearer token missing.",
    });
  }
};

export default protect;
