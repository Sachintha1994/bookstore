const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

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

  res.json(books);
});

router.post('/', (req, res) => {
  const { title, author, category, isbn, price, stock_quantity, reorder_threshold, cover_image } = req.body || {};

  if (!title || price === undefined || price === null) {
    return res.status(400).json({ error: 'title and price are required' });
  }

  const result = db
    .prepare(
      `INSERT INTO books (title, author, category, isbn, price, stock_quantity, reorder_threshold, cover_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title,
      author || null,
      category || null,
      isbn || null,
      Number(price),
      Number(stock_quantity) || 0,
      reorder_threshold === undefined ? 5 : Number(reorder_threshold),
      cover_image || null
    );

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(book);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const { title, author, category, isbn, price, stock_quantity, reorder_threshold, cover_image } = req.body || {};

  db.prepare(
    `UPDATE books SET
       title = ?, author = ?, category = ?, isbn = ?, price = ?, stock_quantity = ?, reorder_threshold = ?, cover_image = ?
     WHERE id = ?`
  ).run(
    title ?? existing.title,
    author ?? existing.author,
    category ?? existing.category,
    isbn ?? existing.isbn,
    price !== undefined ? Number(price) : existing.price,
    stock_quantity !== undefined ? Number(stock_quantity) : existing.stock_quantity,
    reorder_threshold !== undefined ? Number(reorder_threshold) : existing.reorder_threshold,
    cover_image !== undefined ? (cover_image || null) : existing.cover_image,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Book not found' });
  }

  try {
    db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  } catch (err) {
    if (err && /FOREIGN KEY constraint failed/i.test(err.message || '')) {
      return res.status(409).json({ error: 'Cannot delete a book with recorded sales.' });
    }
    throw err;
  }

  res.status(204).send();
});

module.exports = router;
