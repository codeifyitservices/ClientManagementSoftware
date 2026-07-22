import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";

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

      // Find the associated admin profile, excluding the password field
      req.admin = await Admin.findById(decoded.id).select("-password");
      
      if (!req.admin) {
        return res.status(401).json({ message: "Administrator account not found." });
      }

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
