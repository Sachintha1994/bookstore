const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendError } = require('../utils/errors');
const { paginate } = require('../utils/pagination');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
  const result = paginate(req, res, customers);
  res.json(result.body);
});

router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) {
    return sendError(res, 404, 'NOT_FOUND', 'Customer not found');
  }
  res.json(customer);
});

router.post('/', (req, res) => {
  const { name, phone, email } = req.body || {};

  const details = [];
  if (!name || typeof name !== 'string' || !name.trim()) {
    details.push({ field: 'name', issue: 'name is required' });
  }

  if (details.length > 0) {
    return sendError(res, 400, 'INVALID_INPUT', 'Validation failed', details);
  }

  const result = db
    .prepare('INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)')
    .run(name.trim(), phone ? String(phone).trim() : null, email ? String(email).trim() : null);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.setHeader('Location', `/api/v1/customers/${customer.id}`);
  res.status(201).json(customer);
});

module.exports = router;
