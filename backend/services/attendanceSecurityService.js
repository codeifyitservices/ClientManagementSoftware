import IpWhitelist from "../models/ipWhitelistModel.js";
import EmployeeLocation from "../models/employeeLocationModel.js";
import AttendanceSecurityAudit from "../models/attendanceSecurityAuditModel.js";
import Employee from "../models/employeeModel.js";
import AttendancePolicy from "../models/attendancePolicyModel.js";

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
 * When both IP and Geolocation enforcement are ON:
 * An employee CAN ONLY check in if BOTH their IP matches an authorized IP whitelist
 * AND their GPS coordinates are within an authorized office geofence.
 */
export const validateAttendanceAccess = async (employeeId, requestContext = {}) => {
  const now = new Date();
  const currentIp = requestContext.ip || "127.0.0.1";
  const userLat =
    requestContext.latitude !== undefined &&
    requestContext.latitude !== null &&
    requestContext.latitude !== ""
      ? Number(requestContext.latitude)
      : null;
  const userLng =
    requestContext.longitude !== undefined &&
    requestContext.longitude !== null &&
    requestContext.longitude !== ""
      ? Number(requestContext.longitude)
      : null;

  // 1. Fetch Policy to check enforcement flags
  const policy = await AttendancePolicy.findOne({ companyId: "default_company" });
  const enforceGeofence = !!(policy?.enforceGeofence || policy?.rules?.enableGeofencing);
  const enforceIpWhitelist = !!(policy?.enforceIpWhitelist || policy?.rules?.enableIpValidation);

  // If neither enforcement is active, allow checkin by default
  if (!enforceGeofence && !enforceIpWhitelist) {
    return {
      allowed: true,
      reason: "SECURITY_ENFORCEMENT_DISABLED",
      ip: currentIp,
      location:
        userLat !== null && userLng !== null
          ? `Lat ${userLat.toFixed(4)}, Lng ${userLng.toFixed(4)}`
          : "Default Office Access",
      matchedRule: null,
      message: "Allowed (IP and Geolocation security enforcements are disabled)",
    };
  }

  // 2. Auto-expire old IP whitelist entries
  await IpWhitelist.updateMany(
    {
      status: "Active",
      expiresAt: { $ne: null, $lte: now },
    },
    {
      $set: { status: "Expired" },
    }
  );

  // 3. Fetch active whitelist rules and office locations
  let activeWhitelists = await IpWhitelist.find({
    status: "Active",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  });

  let activeLocations = await EmployeeLocation.find({ status: "Active" });

  // Ensure default Headquarters is registered at current office coordinates (28.3973, 77.3132)
  const hasCurrentOffice = activeLocations.some(
    (loc) => Math.abs(Number(loc.latitude) - 28.3973) < 0.01 && Math.abs(Number(loc.longitude) - 77.3132) < 0.01
  );

  if (!hasCurrentOffice) {
    // If an old dummy Headquarters exists, update it; otherwise create it
    const existingHq = await EmployeeLocation.findOne({ locationName: { $regex: /Headquarters/i } });
    if (existingHq) {
      existingHq.latitude = 28.3973;
      existingHq.longitude = 77.3132;
      existingHq.radiusMeters = 100;
      existingHq.status = "Active";
      await existingHq.save();
    } else {
      await EmployeeLocation.create({
        locationName: "Headquarters (Main Office)",
        latitude: 28.3973,
        longitude: 77.3132,
        radiusMeters: 100,
        isOrgWide: true,
        status: "Active",
        address: "Main Office",
      });
    }
    activeLocations = await EmployeeLocation.find({ status: "Active" });
  }

  // Remove any previously auto-seeded localhost so 127.0.0.1 is strictly required to be manually whitelisted
  await IpWhitelist.deleteMany({ locationName: "Office Network / Localhost", ipAddress: "127.0.0.1" });
  activeWhitelists = await IpWhitelist.find({
    status: "Active",
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  });

  // 4. Check for active approved Work From Home (WFH) whitelist pass
  const matchedWfhRule = activeWhitelists.find((rule) => {
    if (rule.type !== "WFH") return false;
    if (rule.employee && String(rule.employee) === String(employeeId)) {
      return true;
    }
    return false;
  });

  if (matchedWfhRule) {
    const isIpMatched = !matchedWfhRule.ipAddress || matchedWfhRule.ipAddress === currentIp;
    return {
      allowed: true,
      reason: "WFH_APPROVED",
      ip: currentIp,
      location: matchedWfhRule.locationName || "Approved Remote / WFH Network",
      matchedRule: matchedWfhRule._id,
      isIpMatched,
      message: `Check-in allowed via approved Work From Home (WFH) authorization (${matchedWfhRule.locationName || "Home Network"})`,
    };
  }

  // 5. Evaluate IP Match
  let ipMatches = false;
  let matchedIpRule = null;
  if (enforceIpWhitelist) {
    const allIpRules = [...activeWhitelists];
    if (Array.isArray(policy?.ipWhitelist)) {
      for (const item of policy.ipWhitelist) {
        if (item?.ip) {
          allIpRules.push({
            ipAddress: item.ip.trim(),
            locationName: item.label || "Office Network",
            scope: "Organization",
          });
        }
      }
    }
    if (Array.isArray(policy?.rules?.ipWhitelist)) {
      for (const item of policy.rules.ipWhitelist) {
        if (item?.ip) {
          allIpRules.push({
            ipAddress: item.ip.trim(),
            locationName: item.label || "Office Network",
            scope: "Organization",
          });
        }
      }
    }

    // Ensure 103.160.234.194 is in active rules
    if (!allIpRules.some(r => r.ipAddress === "103.160.234.194")) {
      allIpRules.push({
        ipAddress: "103.160.234.194",
        locationName: "Current Office Network",
        scope: "Organization",
      });
      // Also persist to collection
      IpWhitelist.create({
        locationName: "Current Office Network",
        ipAddress: "103.160.234.194",
        scope: "Organization",
        type: "Permanent",
        status: "Active",
      }).catch(() => {});
    }

    matchedIpRule = allIpRules.find((rule) => {
      if (!rule?.ipAddress) return false;
      if (rule.ipAddress.trim() !== currentIp.trim()) return false;
      if (!rule.scope || rule.scope === "Organization") return true;
      if (rule.scope === "Employee" && rule.employee && String(rule.employee) === String(employeeId)) {
        return true;
      }
      return false;
    });
    ipMatches = !!matchedIpRule;
  }

  // 6. Evaluate Geolocation Match
  let locationMatches = false;
  let matchedLocationRule = null;
  let closestLocation = null;
  let minDistanceMeters = Infinity;

  if (enforceGeofence) {
    if (userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng)) {
      // Gather all possible active locations from model and policy
      const candidateLocations = [...activeLocations];
      if (Array.isArray(policy?.locations)) {
        candidateLocations.push(...policy.locations);
      }
      if (Array.isArray(policy?.rules?.officeLocations)) {
        candidateLocations.push(...policy.rules.officeLocations);
      }

      for (const loc of candidateLocations) {
        if (!loc || loc.latitude === undefined || loc.longitude === undefined) continue;
        // Must be Org-wide OR assigned to this specific employee
        if (!loc.isOrgWide && loc.employee && String(loc.employee) !== String(employeeId)) {
          continue;
        }
        const dist = calculateDistanceMeters(userLat, userLng, Number(loc.latitude), Number(loc.longitude));
        const maxRadius = loc.radiusMeters !== undefined && loc.radiusMeters !== null 
          ? Number(loc.radiusMeters) 
          : (policy?.defaultGeofenceRadiusMeters || 100);

        if (dist < minDistanceMeters) {
          minDistanceMeters = dist;
          closestLocation = loc;
        }

        if (dist <= maxRadius) {
          if (!matchedLocationRule || dist < calculateDistanceMeters(userLat, userLng, matchedLocationRule.latitude, matchedLocationRule.longitude)) {
            matchedLocationRule = loc;
          }
        }
      }
      locationMatches = !!matchedLocationRule;
    }
  }

  // 7. Security Enforcement Evaluation:

  // Case A: BOTH IP and Geolocation enforcement are ON
  if (enforceIpWhitelist && enforceGeofence) {
    // Both must pass
    if (ipMatches && locationMatches) {
      return {
        allowed: true,
        reason: "ALLOWED_IP_AND_LOCATION_MATCH",
        ip: currentIp,
        location: `${matchedLocationRule.locationName || "Office"} (${Math.round(minDistanceMeters)}m from center, within 100m allowed, IP: ${currentIp})`,
        matchedRule: matchedLocationRule._id,
        message: `Check-in verified: Authorized IP (${currentIp}) & Verified GPS location (${matchedLocationRule.locationName || "Office"} - ${Math.round(minDistanceMeters)}m, within allowed 100m).`,
      };
    }

    if (!ipMatches && !locationMatches) {
      const closestName = closestLocation?.locationName ? ` from ${closestLocation.locationName}` : "";
      const locText =
        userLat === null || userLng === null
          ? "GPS coordinates not provided"
          : `Lat ${userLat.toFixed(4)}, Lng ${userLng.toFixed(4)} (${minDistanceMeters === Infinity ? "outside office bounds" : Math.round(minDistanceMeters) + "m away" + closestName + ", max 100m allowed"})`;
      return {
        allowed: false,
        reason: "IP_AND_LOCATION_NOT_ALLOWED",
        failedChecks: ["IP Address", "Geolocation"],
        ip: currentIp,
        location:
          userLat !== null && userLng !== null
            ? `Lat ${userLat.toFixed(4)}, Lng ${userLng.toFixed(4)} (${minDistanceMeters === Infinity ? "Outside Office" : Math.round(minDistanceMeters) + "m away" + closestName})`
            : "GPS Unavailable",
        matchedRule: null,
        message: `Check-in Blocked: Both IP and Geolocation checks failed.\n• Attempted IP: ${currentIp} (Not Whitelisted)\n• Attempted Location: ${locText}`,
      };
    }

    if (!ipMatches && locationMatches) {
      return {
        allowed: false,
        reason: "IP_NOT_WHITELISTED",
        failedChecks: ["IP Address"],
        ip: currentIp,
        location: `${matchedLocationRule.locationName || "Office"} (${Math.round(minDistanceMeters)}m away, within 100m allowed)`,
        matchedRule: matchedLocationRule._id,
        message: `Check-in Blocked: IP validation failed.\n• Geolocation Check: Passed (Verified at ${matchedLocationRule.locationName || "Office"} - ${Math.round(minDistanceMeters)}m away, within 100m allowed)\n• IP Check: Failed (Attempted IP: ${currentIp} is not in the authorized office network whitelist)\n• Please connect to the official office Wi-Fi network to check in.`,
      };
    }

    if (ipMatches && !locationMatches) {
      const closestName = closestLocation?.locationName ? ` of ${closestLocation.locationName}` : "";
      const locText =
        userLat === null || userLng === null
          ? "Device GPS coordinates were not provided. Please enable GPS/Location in your browser."
          : `Coordinates (Lat ${userLat.toFixed(4)}, Lng ${userLng.toFixed(4)}) are outside authorized office geofence (${minDistanceMeters === Infinity ? "no matching office location" : Math.round(minDistanceMeters) + "m away" + closestName + ", max 100m allowed"}).`;
      return {
        allowed: false,
        reason: "LOCATION_NOT_ALLOWED",
        failedChecks: ["Geolocation"],
        ip: currentIp,
        location:
          userLat !== null && userLng !== null
            ? `Lat ${userLat.toFixed(4)}, Lng ${userLng.toFixed(4)} (${minDistanceMeters === Infinity ? "Outside" : Math.round(minDistanceMeters) + "m away" + closestName})`
            : "GPS Unavailable",
        matchedRule: matchedIpRule?._id,
        message: `Check-in Blocked: Geolocation validation failed.\n• Attempted Location: ${locText}\n• Attempted IP: ${matchedIpRule?.locationName || currentIp} (Authorized Network)`,
      };
    }
  }

  // Case B: ONLY IP enforcement is ON
  if (enforceIpWhitelist && !enforceGeofence) {
    if (ipMatches) {
      return {
        allowed: true,
        reason: "ALLOWED_IP_MATCH",
        ip: currentIp,
        location: matchedIpRule?.locationName || "Approved Network",
        matchedRule: matchedIpRule?._id,
        message: `Check-in allowed via whitelisted network IP (${currentIp})`,
      };
    }
    return {
      allowed: false,
      reason: "IP_NOT_WHITELISTED",
      failedChecks: ["IP Address"],
      ip: currentIp,
      location:
        userLat !== null && userLng !== null
          ? `Lat ${userLat.toFixed(4)}, Lng ${userLng.toFixed(4)}`
          : "GPS Not Checked",
      matchedRule: null,
      message: `Check-in Blocked: Network IP validation failed.\n• Attempted IP: ${currentIp} is not in the authorized IP whitelist.`,
    };
  }

  // Case C: ONLY Geolocation enforcement is ON
  if (!enforceIpWhitelist && enforceGeofence) {
    if (locationMatches) {
      return {
        allowed: true,
        reason: "ALLOWED_LOCATION_MATCH",
        ip: currentIp,
        location: `${matchedLocationRule.locationName || "Office"} (${Math.round(minDistanceMeters)}m from center, within 100m allowed)`,
        matchedRule: matchedLocationRule._id,
        message: `Check-in allowed via verified office location (${matchedLocationRule.locationName || "Office"} - ${Math.round(minDistanceMeters)}m, within allowed 100m)`,
      };
    }

    if (userLat === null || userLng === null) {
      return {
        allowed: false,
        reason: "GPS_UNAVAILABLE",
        failedChecks: ["Geolocation (Missing GPS)"],
        ip: currentIp,
        location: "GPS Unavailable",
        matchedRule: null,
        message: "Check-in Blocked: Geolocation is required by policy, but device GPS was not provided. Please allow location permissions in your browser.",
      };
    }

    const closestName = closestLocation?.locationName ? ` of ${closestLocation.locationName}` : "";
    return {
      allowed: false,
      reason: "LOCATION_OUTSIDE_GEOFENCE",
      failedChecks: ["Geolocation"],
      ip: currentIp,
      location: `Lat ${userLat.toFixed(4)}, Lng ${userLng.toFixed(4)} (${minDistanceMeters === Infinity ? "Outside" : Math.round(minDistanceMeters) + "m away" + closestName})`,
      matchedRule: null,
      message: `Check-in Blocked: Geolocation check failed.\n• Attempted Coordinates: Lat ${userLat.toFixed(4)}, Lng ${userLng.toFixed(4)} (${minDistanceMeters === Infinity ? "no matching office location" : Math.round(minDistanceMeters) + "m away" + closestName + ", max 100m allowed"}).`,
    };
  }
};
