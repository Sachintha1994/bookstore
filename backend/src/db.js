const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = process.env.VERCEL ? '/tmp' : (process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'bookstore.db');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    category TEXT,
    isbn TEXT,
    price REAL NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reorder_threshold INTEGER NOT NULL DEFAULT 5,
    cover_image TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id),
    total_amount REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    book_id INTEGER NOT NULL REFERENCES books(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL
  );
`);

// Ensure cover_image column exists for existing databases
try {
  const tableInfo = db.prepare('PRAGMA table_info(books)').all();
  const hasCoverImage = tableInfo.some((col) => col.name === 'cover_image');
  if (!hasCoverImage) {
    db.exec('ALTER TABLE books ADD COLUMN cover_image TEXT');
  }
} catch (err) {
  console.error('Error ensuring cover_image column exists:', err);
}

function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = db;
module.exports.transaction = transaction;


// Auto-seed admin user and sample catalog if empty
try {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', passwordHash, 'admin');

    const sampleBooks = [
      { title: 'The Alchemist', author: 'Paulo Coelho', category: 'Fiction', isbn: '9780061122415', price: 1200, stock_quantity: 20, reorder_threshold: 5, cover_image: 'https://covers.openlibrary.org/b/isbn/9780062315007-M.jpg' },
      { title: 'Atomic Habits', author: 'James Clear', category: 'Self-Help', isbn: '9780735211292', price: 1800, stock_quantity: 15, reorder_threshold: 5, cover_image: 'https://covers.openlibrary.org/b/isbn/9780735211292-M.jpg' },
      { title: 'Clean Code', author: 'Robert C. Martin', category: 'Technology', isbn: '9780132350884', price: 3500, stock_quantity: 3, reorder_threshold: 5, cover_image: 'https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg' },
      { title: 'Sapiens', author: 'Yuval Noah Harari', category: 'History', isbn: '9780062316097', price: 2200, stock_quantity: 10, reorder_threshold: 4, cover_image: 'https://covers.openlibrary.org/b/isbn/9780062316097-M.jpg' },
      { title: 'The Hobbit', author: 'J.R.R. Tolkien', category: 'Fantasy', isbn: '9780547928227', price: 1500, stock_quantity: 2, reorder_threshold: 5, cover_image: 'https://covers.openlibrary.org/b/isbn/9780547928227-M.jpg' },
      { title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki', category: 'Finance', isbn: '9781612680194', price: 1600, stock_quantity: 25, reorder_threshold: 5, cover_image: 'https://covers.openlibrary.org/b/isbn/9781612680194-M.jpg' }
    ];

    const insertBook = db.prepare('INSERT INTO books (title, author, category, isbn, price, stock_quantity, reorder_threshold, cover_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const b of sampleBooks) {
      insertBook.run(b.title, b.author, b.category, b.isbn, b.price, b.stock_quantity, b.reorder_threshold, b.cover_image);
    }
  }
} catch (seedErr) {
  console.error('Auto-seed check error:', seedErr);
}
