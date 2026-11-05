const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendError } = require('../utils/errors');
const { paginate } = require('../utils/pagination');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { search } = req.query;
  let books;

  if (search) {
    const term = `%${search}%`;
    books = db
      .prepare(
        `SELECT * FROM books
         WHERE title LIKE ? OR author LIKE ? OR category LIKE ? OR isbn LIKE ?
         ORDER BY title`
      )
      .all(term, term, term, term);
  } else {
    books = db.prepare('SELECT * FROM books ORDER BY title').all();
  }

  const result = paginate(req, res, books);
  res.json(result.body);
});

router.get('/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) {
    return sendError(res, 404, 'NOT_FOUND', 'Book not found');
  }
  res.json(book);
});

router.post('/', (req, res) => {
  const { title, author, category, isbn, price, stock_quantity, reorder_threshold, cover_image } = req.body || {};

  const details = [];
  if (!title || typeof title !== 'string' || !title.trim()) {
    details.push({ field: 'title', issue: 'title is required and cannot be empty' });
  }
  if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
    details.push({ field: 'price', issue: 'price must be a valid non-negative number' });
  }
  if (stock_quantity !== undefined && (isNaN(Number(stock_quantity)) || Number(stock_quantity) < 0)) {
    details.push({ field: 'stock_quantity', issue: 'stock_quantity must be a non-negative integer' });
  }
  if (reorder_threshold !== undefined && (isNaN(Number(reorder_threshold)) || Number(reorder_threshold) < 0)) {
    details.push({ field: 'reorder_threshold', issue: 'reorder_threshold must be a non-negative integer' });
  }

  if (details.length > 0) {
    return sendError(res, 400, 'INVALID_INPUT', 'Validation failed', details);
  }

  const result = db
    .prepare(
      `INSERT INTO books (title, author, category, isbn, price, stock_quantity, reorder_threshold, cover_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title.trim(),
      author ? String(author).trim() : null,
      category ? String(category).trim() : null,
      isbn ? String(isbn).trim() : null,
      Number(price),
      Number(stock_quantity) || 0,
      reorder_threshold === undefined ? 5 : Number(reorder_threshold),
      cover_image ? String(cover_image).trim() : null
    );

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
  res.setHeader('Location', `/api/v1/books/${book.id}`);
  res.status(201).json(book);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!existing) {
    return sendError(res, 404, 'NOT_FOUND', 'Book not found');
  }

  const { title, author, category, isbn, price, stock_quantity, reorder_threshold, cover_image } = req.body || {};

  const details = [];
  if (title !== undefined && (!title || typeof title !== 'string' || !title.trim())) {
    details.push({ field: 'title', issue: 'title cannot be empty' });
  }
  if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
    details.push({ field: 'price', issue: 'price must be a non-negative number' });
  }
  if (stock_quantity !== undefined && (isNaN(Number(stock_quantity)) || Number(stock_quantity) < 0)) {
    details.push({ field: 'stock_quantity', issue: 'stock_quantity must be a non-negative integer' });
  }
  if (reorder_threshold !== undefined && (isNaN(Number(reorder_threshold)) || Number(reorder_threshold) < 0)) {
    details.push({ field: 'reorder_threshold', issue: 'reorder_threshold must be a non-negative integer' });
  }

  if (details.length > 0) {
    return sendError(res, 400, 'INVALID_INPUT', 'Validation failed', details);
  }

  db.prepare(
    `UPDATE books SET
       title = ?, author = ?, category = ?, isbn = ?, price = ?, stock_quantity = ?, reorder_threshold = ?, cover_image = ?
     WHERE id = ?`
  ).run(
    title !== undefined ? title.trim() : existing.title,
    author !== undefined ? (author ? String(author).trim() : null) : existing.author,
    category !== undefined ? (category ? String(category).trim() : null) : existing.category,
    isbn !== undefined ? (isbn ? String(isbn).trim() : null) : existing.isbn,
    price !== undefined ? Number(price) : existing.price,
    stock_quantity !== undefined ? Number(stock_quantity) : existing.stock_quantity,
    reorder_threshold !== undefined ? Number(reorder_threshold) : existing.reorder_threshold,
    cover_image !== undefined ? (cover_image ? String(cover_image).trim() : null) : existing.cover_image,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!existing) {
    return sendError(res, 404, 'NOT_FOUND', 'Book not found');
  }

  const { title, author, category, isbn, price, stock_quantity, reorder_threshold, cover_image } = req.body || {};

  const details = [];
  if (title !== undefined && (!title || typeof title !== 'string' || !title.trim())) {
    details.push({ field: 'title', issue: 'title cannot be empty' });
  }
  if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
    details.push({ field: 'price', issue: 'price must be a non-negative number' });
  }
  if (stock_quantity !== undefined && (isNaN(Number(stock_quantity)) || Number(stock_quantity) < 0)) {
    details.push({ field: 'stock_quantity', issue: 'stock_quantity must be a non-negative integer' });
  }
  if (reorder_threshold !== undefined && (isNaN(Number(reorder_threshold)) || Number(reorder_threshold) < 0)) {
    details.push({ field: 'reorder_threshold', issue: 'reorder_threshold must be a non-negative integer' });
  }

  if (details.length > 0) {
    return sendError(res, 400, 'INVALID_INPUT', 'Validation failed', details);
  }

  db.prepare(
    `UPDATE books SET
       title = ?, author = ?, category = ?, isbn = ?, price = ?, stock_quantity = ?, reorder_threshold = ?, cover_image = ?
     WHERE id = ?`
  ).run(
    title !== undefined ? title.trim() : existing.title,
    author !== undefined ? (author ? String(author).trim() : null) : existing.author,
    category !== undefined ? (category ? String(category).trim() : null) : existing.category,
    isbn !== undefined ? (isbn ? String(isbn).trim() : null) : existing.isbn,
    price !== undefined ? Number(price) : existing.price,
    stock_quantity !== undefined ? Number(stock_quantity) : existing.stock_quantity,
    reorder_threshold !== undefined ? Number(reorder_threshold) : existing.reorder_threshold,
    cover_image !== undefined ? (cover_image ? String(cover_image).trim() : null) : existing.cover_image,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!existing) {
    return sendError(res, 404, 'NOT_FOUND', 'Book not found');
  }

  try {
    db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  } catch (err) {
    if (err && /FOREIGN KEY constraint failed/i.test(err.message || '')) {
      return sendError(
        res,
        409,
        'CONFLICT',
        'Cannot delete a book with recorded sales.'
      );
    }
    throw err;
  }

  res.status(204).send();
});

module.exports = router;
