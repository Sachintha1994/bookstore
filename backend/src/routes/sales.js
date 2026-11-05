const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendError, AppError } = require('../utils/errors');
const { paginate } = require('../utils/pagination');

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

  const details = [];
  if (!Array.isArray(items) || items.length === 0) {
    details.push({ field: 'items', issue: 'items must be a non-empty array of {book_id, quantity}' });
    return sendError(res, 400, 'INVALID_INPUT', 'Validation failed', details);
  }

  items.forEach((item, index) => {
    if (!item.book_id) {
      details.push({ field: `items[${index}].book_id`, issue: 'book_id is required' });
    }
    if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
      details.push({ field: `items[${index}].quantity`, issue: 'quantity must be a positive integer' });
    }
  });

  if (details.length > 0) {
    return sendError(res, 400, 'INVALID_INPUT', 'Validation failed', details);
  }

  function createSale(customerId, saleItems) {
    const books = saleItems.map((item, index) => {
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(item.book_id);
      if (!book) {
        throw new AppError(400, 'INVALID_INPUT', 'Validation failed', [
          { field: `items[${index}].book_id`, issue: `Book with id ${item.book_id} not found` },
        ]);
      }
      if (item.quantity > book.stock_quantity) {
        throw new AppError(400, 'INVALID_INPUT', 'Validation failed', [
          {
            field: `items[${index}].quantity`,
            issue: `Insufficient stock for "${book.title}": requested ${item.quantity}, only ${book.stock_quantity} available`,
          },
        ]);
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
    res.setHeader('Location', `/api/v1/sales/${sale.id}`);
    res.status(201).json(sale);
  } catch (err) {
    if (err instanceof AppError) {
      return sendError(res, err.statusCode, err.code, err.message, err.details);
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

  const result = paginate(req, res, sales);
  res.json(result.body);
});

router.get('/:id', (req, res) => {
  const sale = getSaleDetail(req.params.id);
  if (!sale) {
    return sendError(res, 404, 'NOT_FOUND', 'Sale not found');
  }
  res.json(sale);
});

module.exports = router;
