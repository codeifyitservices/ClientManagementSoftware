import IpWhitelist from "../models/ipWhitelistModel.js";
import EmployeeLocation from "../models/employeeLocationModel.js";
import AttendanceSecurityAudit from "../models/attendanceSecurityAuditModel.js";
import Employee from "../models/employeeModel.js";

/**
 * Extracts and normalizes the client IP address from HTTP request headers & socket.
 */
export const getClientIp = (req) => {
  if (!req) return "127.0.0.1";

  const forwarded = req.headers["x-forwarded-for"];
  let ip = "";

  if (forwarded && typeof forwarded === "string") {
    ip = forwarded.split(",")[0].trim();
  } else if (req.headers["cf-connecting-ip"]) {
    ip = String(req.headers["cf-connecting-ip"]).trim();
  } else if (req.headers["x-real-ip"]) {
    ip = String(req.headers["x-real-ip"]).trim();
  } else if (req.ip) {
    ip = req.ip;
  } else if (req.socket && req.socket.remoteAddress) {
    ip = req.socket.remoteAddress;
  }

  if (!ip) ip = "127.0.0.1";

  // Clean IPv6 mapped IPv4 address (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }
  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  // Remove port if included
  if (ip.includes(":") && ip.includes(".")) {
    ip = ip.split(":")[0];
  }

  return ip;
};

/**
 * Calculates distance in meters between two lat/lng points using the Haversine formula.
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    lat1 === null ||
    lon1 === null ||
    lat2 === null ||
    lon2 === null
  ) {
    return Infinity;
  }

  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Logs a security audit entry.
 */
export const logSecurityAudit = async ({
  action,
  performedBy = null,
  employee = null,
  ip = "",
  location = "",
  reason = "",
  matchedRule = null,
  metadata = {},
}) => {
  try {
    await AttendanceSecurityAudit.create({
      action,
      performedBy,
      employee,
      ip,
      location,
      reason,
      matchedRule,
      metadata,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Failed to write security audit log:", err);
  }
};

/**
 * Evaluates attendance security rules for an employee.
 */
export const validateAttendanceAccess = async (employeeId, requestContext = {}) => {
  const now = new Date();
  const currentIp = requestContext.ip || "127.0.0.1";
  const userLat = requestContext.latitude !== undefined && requestContext.latitude !== null ? Number(requestContext.latitude) : null;
  const userLng = requestContext.longitude !== undefined && requestContext.longitude !== null ? Number(requestContext.longitude) : null;

  // 1. Auto-expire old IP whitelist entries
  await IpWhitelist.updateMany(
    {
      status: "Active",
      expiresAt: { $ne: null, $lte: now },
    },
    {
      $set: { status: "Expired" },
    }
  );

  // 2. Fetch all active whitelist rules
  const activeWhitelists = await IpWhitelist.find({
    status: "Active",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  });

  // 3. Fetch all active office / employee geolocation rules
  const activeLocations = await EmployeeLocation.find({ status: "Active" });

  // If no whitelist or geolocation rules have been configured yet, allow check-in by default
  if (activeWhitelists.length === 0 && activeLocations.length === 0) {
    return {
      allowed: true,
      reason: "NO_SECURITY_RULES_CONFIGURED",
      ip: currentIp,
      location: "Default Office Access",
      matchedRule: null,
      message: "Allowed (No security restrictions configured)",
    };
  }

  // 4. Check IP Whitelist match
  // Rule matches if IP equals whitelisted IP AND (scope is Organization OR employee matches employeeId)
  const matchedIpRule = activeWhitelists.find((rule) => {
    if (rule.ipAddress !== currentIp) return false;
    if (rule.scope === "Organization") return true;
    if (rule.scope === "Employee" && rule.employee && String(rule.employee) === String(employeeId)) {
      return true;
    }
    return false;
  });

  if (matchedIpRule) {
    const isWfh = matchedIpRule.type === "WFH";
    return {
      allowed: true,
      reason: isWfh ? "WFH_APPROVED" : "ALLOWED_IP_MATCH",
      ip: currentIp,
      location: matchedIpRule.locationName || "Approved Network",
      matchedRule: matchedIpRule._id,
      message: isWfh ? "Check-in allowed via approved Work From Home whitelist" : "Check-in allowed via whitelisted network IP",
    };
  }

  // 5. Check Geolocation Radius match
  let matchedLocationRule = null;
  let minDistanceMeters = Infinity;

  if (userLat !== null && userLng !== null) {
    for (const loc of activeLocations) {
      // Must be Org-wide OR assigned to this specific employee
      if (!loc.isOrgWide && loc.employee && String(loc.employee) !== String(employeeId)) {
        continue;
      }
      const dist = calculateDistanceMeters(userLat, userLng, loc.latitude, loc.longitude);
      if (dist <= loc.radiusMeters) {
        if (dist < minDistanceMeters) {
          minDistanceMeters = dist;
          matchedLocationRule = loc;
        }
      }
    }
  }

  if (matchedLocationRule) {
    return {
      allowed: true,
      reason: "ALLOWED_LOCATION_MATCH",
      ip: currentIp,
      location: `${matchedLocationRule.locationName} (${Math.round(minDistanceMeters)}m away)`,
      matchedRule: matchedLocationRule._id,
      message: "Check-in allowed via verified office geolocation radius",
    };
  }

  // 6. If neither IP nor Geolocation matched, deny check-in
  const failureReason = userLat === null
    ? "IP_NOT_WHITELISTED_GPS_UNAVAILABLE"
    : "IP_AND_LOCATION_NOT_ALLOWED";

  return {
    allowed: false,
    reason: failureReason,
    ip: currentIp,
    location: userLat !== null ? `Lat ${userLat.toFixed(4)}, Lng ${userLng.toFixed(4)}` : "Unknown Location",
    matchedRule: null,
    message: "Check-in is not available from your current location/network. Please connect from an approved location or request Work From Home.",
  };
};
