/**
 * Standardized Error Envelope Utilities according to company api-design standards.
 *
 * Envelope Format:
 * {
 *   "error": {
 *     "code": "INVALID_INPUT",
 *     "message": "Human-readable explanation",
 *     "details": [
 *       { "field": "isbn", "issue": "ISBN must be 13 digits" }
 *     ]
 *   }
 * }
 */

class AppError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
  }
}

function sendError(res, statusCode, code, message, details = []) {
  return res.status(statusCode).json({
    error: {
      code,
      message,
      details: Array.isArray(details) ? details : [],
    },
  });
}

const errors = {
  AppError,
  sendError,
  badRequest: (message = 'Validation failure', details = []) =>
    new AppError(400, 'INVALID_INPUT', message, details),
  unauthorized: (message = 'Unauthorized') =>
    new AppError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Forbidden') =>
    new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Resource not found') =>
    new AppError(404, 'NOT_FOUND', message),
  conflict: (message = 'Resource conflict') =>
    new AppError(409, 'CONFLICT', message),
  rateLimitExceeded: (message = 'Too many requests, please try again later') =>
    new AppError(429, 'RATE_LIMIT_EXCEEDED', message),
  internalError: (message = 'Internal server error') =>
    new AppError(500, 'INTERNAL_ERROR', message),
};

module.exports = errors;
