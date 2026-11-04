const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
  res.json(customers);
});

router.post('/', (req, res) => {
  const { name, phone, email } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const result = db
    .prepare('INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)')
    .run(name, phone || null, email || null);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(customer);
});

module.exports = router;
