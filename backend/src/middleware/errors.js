function sendError(res, status, code, message, details = []) {
  return res.status(status).json({
    error: {
      code,
      message,
      details
    }
  });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  // Handle express JSON body parsing errors
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_INPUT', 'Malformed JSON payload in request body');
  }

  // Handle custom status errors
  if (err.status) {
    const code = err.code || (err.status === 404 ? 'NOT_FOUND' : err.status === 409 ? 'CONFLICT' : 'INVALID_INPUT');
    return sendError(res, err.status, code, err.message || 'Request failed', err.details || []);
  }

  // Fallback to internal error
  return sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
}

module.exports = {
  sendError,
  errorHandler
};
