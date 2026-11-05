// In-memory sliding window / token bucket rate limiter
// Window: 60 seconds (1 minute), limit: 120 requests per IP
const windowMs = 60 * 1000;
const maxRequests = 120;
const ipRequests = new Map();

// Periodic cleanup of expired entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequests.entries()) {
    if (now - record.startTime > windowMs) {
      ipRequests.delete(ip);
    }
  }
}, 2 * 60 * 1000).unref();

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  let record = ipRequests.get(ip);
  if (!record || now - record.startTime > windowMs) {
    record = {
      startTime: now,
      count: 0,
      resetTime: Math.ceil((now + windowMs) / 1000)
    };
    ipRequests.set(ip, record);
  }

  record.count += 1;
  const remaining = Math.max(0, maxRequests - record.count);
  const resetSeconds = Math.max(0, record.resetTime - Math.floor(now / 1000));

  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(resetSeconds));

  if (record.count > maxRequests) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
        details: [{ field: 'rate_limit', issue: 'Limit of ' + maxRequests + ' requests per minute exceeded' }]
      }
    });
  }

  next();
}

module.exports = { rateLimiter };
