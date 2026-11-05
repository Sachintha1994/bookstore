const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../config');
const { sendError } = require('../utils/errors');
const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Stricter rate limiter for authentication endpoint (30 attempts / 15 minutes)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please try again later.',
});

router.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body || {};

  const details = [];
  if (!username || typeof username !== 'string' || !username.trim()) {
    details.push({ field: 'username', issue: 'username is required' });
  }
  if (!password || typeof password !== 'string') {
    details.push({ field: 'password', issue: 'password is required' });
  }

  if (details.length > 0) {
    return sendError(res, 400, 'INVALID_INPUT', 'Validation failed', details);
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Invalid username or password');
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token });
});

module.exports = router;
