/**
 * Simple in-memory rate limiter middleware for authentication & sensitive endpoints.
 * @param {Object} options - { windowMs, max, message }
 */
export const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 20, message = "Too many requests, please try again later." } = {}) => {
  const requests = new Map();

  // Cleanup expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests.entries()) {
      if (now > data.resetTime) {
        requests.delete(ip);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const clientIp = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    if (!requests.has(clientIp)) {
      requests.set(clientIp, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const data = requests.get(clientIp);

    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + windowMs;
      return next();
    }

    data.count += 1;

    if (data.count > max) {
      return res.status(429).json({
        success: false,
        message,
      });
    }

    next();
  };
};

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Max 10 login attempts per 15 minutes per IP
  message: "Too many login attempts from this IP address. Please try again after 15 minutes.",
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 1000, // Max 1000 requests per 15 minutes per IP
  message: "API rate limit exceeded. Please slow down your requests.",
});

export const agentRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 120, // Max 120 requests per minute per IP for heartbeat/sync
  message: "Agent request rate limit exceeded.",
});
