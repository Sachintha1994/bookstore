const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { sendError } = require('../utils/errors');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return sendError(
      res,
      401,
      'UNAUTHORIZED',
      'Missing or invalid Authorization header'
    );
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}

module.exports = { requireAuth };
