const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function getSaleDetail(saleId) {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
  if (!sale) return null;

  const items = db
    .prepare(
      `SELECT si.id, si.book_id, b.title AS book_title, si.quantity, si.unit_price, si.subtotal
       FROM sale_items si
       JOIN books b ON b.id = si.book_id
       WHERE si.sale_id = ?`
    )
    .all(saleId);

  return { ...sale, items };
}

router.post('/', (req, res) => {
  const { customer_id, items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array of {book_id, quantity}' });
  }

  for (const item of items) {
    if (!item.book_id || !item.quantity || item.quantity <= 0) {
      return res.status(400).json({ error: 'each item requires a valid book_id and a positive quantity' });
    }
  }

  function createSale(customerId, saleItems) {
    const books = saleItems.map((item) => {
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(item.book_id);
      if (!book) {
        throw { status: 400, message: `Book with id ${item.book_id} not found` };
      }
      if (item.quantity > book.stock_quantity) {
        throw {
          status: 400,
          message: `Insufficient stock for "${book.title}": requested ${item.quantity}, only ${book.stock_quantity} in stock`,
        };
      }
      return { book, quantity: item.quantity };
    });

    let totalAmount = 0;
    const lineData = books.map(({ book, quantity }) => {
      const unitPrice = book.price;
      const subtotal = unitPrice * quantity;
      totalAmount += subtotal;
      return { book_id: book.id, quantity, unit_price: unitPrice, subtotal };
    });

    const saleResult = db
      .prepare('INSERT INTO sales (customer_id, total_amount) VALUES (?, ?)')
      .run(customerId || null, totalAmount);

    const saleId = saleResult.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO sale_items (sale_id, book_id, quantity, unit_price, subtotal)
       VALUES (?, ?, ?, ?, ?)`
    );
    const decrementStock = db.prepare(
      'UPDATE books SET stock_quantity = stock_quantity - ? WHERE id = ?'
    );

    for (const line of lineData) {
      insertItem.run(saleId, line.book_id, line.quantity, line.unit_price, line.subtotal);
      decrementStock.run(line.quantity, line.book_id);
    }

    return saleId;
  }

  try {
    const saleId = db.transaction(() => createSale(customer_id, items));
    const sale = getSaleDetail(saleId);
    res.status(201).json(sale);
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
});

router.get('/', (req, res) => {
  const sales = db
    .prepare(
      `SELECT s.id, c.name AS customer_name, s.total_amount, s.created_at
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.created_at DESC`
    )
    .all();

  res.json(sales);
});

router.get('/:id', (req, res) => {
  const sale = getSaleDetail(req.params.id);
  if (!sale) {
    return res.status(404).json({ error: 'Sale not found' });
  }
  res.json(sale);
});

module.exports = router;
