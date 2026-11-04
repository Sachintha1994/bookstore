const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/low-stock', (req, res) => {
  const books = db
    .prepare('SELECT * FROM books WHERE stock_quantity <= reorder_threshold ORDER BY stock_quantity ASC')
    .all();
  res.json(books);
});

router.get('/best-sellers', (req, res) => {
  const books = db
    .prepare(
      `SELECT b.*, COALESCE(SUM(si.quantity), 0) AS total_sold
       FROM books b
       LEFT JOIN sale_items si ON si.book_id = b.id
       GROUP BY b.id
       HAVING total_sold > 0
       ORDER BY total_sold DESC
       LIMIT 10`
    )
    .all();
  res.json(books);
});

module.exports = router;
