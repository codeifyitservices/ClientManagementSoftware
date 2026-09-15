/**
 * adminOnly middleware
 *
 * Must be used AFTER the protect middleware. Checks req.user.role and
 * blocks the request with 403 if the caller is not an Admin.
 *
 * Usage:
 *   router.get("/secret", protect, adminOnly, handler);
 *   // or apply to the whole router in app.js:
 *   app.use("/api/clients", protect, adminOnly, clientRoutes);
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authenticated." });
  }
  if (req.user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. This resource requires administrator privileges.",
    });
  }
  next();
};

export default adminOnly;
