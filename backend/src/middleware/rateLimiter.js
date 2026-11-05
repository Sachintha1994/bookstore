/**
 * Sliding window rate limiting middleware adhering to api-design standards.
 * Emits standard headers:
 * - X-RateLimit-Limit
 * - X-RateLimit-Remaining
 * - X-RateLimit-Reset (Unix timestamp in seconds)
 * Returns 429 RATE_LIMIT_EXCEEDED if limit exceeded.
 */
const { sendError } = require('../utils/errors');

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // default 1 minute
  const max = options.max || 120; // default 120 requests per window
  const message = options.message || 'Too many requests, please try again later.';
  
  const hits = new Map();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }, Math.max(windowMs, 60000));

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    const now = Date.now();
    const clientKey = (req.user && req.user.id)
      ? `user:${req.user.id}`
      : `ip:${req.ip || req.socket.remoteAddress || '127.0.0.1'}`;

    let timestamps = hits.get(clientKey);
    if (!timestamps) {
      timestamps = [];
      hits.set(clientKey, timestamps);
    }

    timestamps = timestamps.filter((t) => now - t < windowMs);
    hits.set(clientKey, timestamps);

    const currentCount = timestamps.length;
    const remaining = Math.max(0, max - (currentCount + 1));
    const oldestTimestamp = timestamps[0] || now;
    const resetTimestampSec = Math.ceil((oldestTimestamp + windowMs) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTimestampSec);

    if (currentCount >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
      res.setHeader('Retry-After', retryAfterSec);
      return sendError(res, 429, 'RATE_LIMIT_EXCEEDED', message);
    }

    timestamps.push(now);
    next();
  };
}

module.exports = { createRateLimiter };
