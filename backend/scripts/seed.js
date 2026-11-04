const bcrypt = require('bcryptjs');
const db = require('../src/db');

function upsertAdmin() {
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (existing) {
    console.log('Admin user already exists, skipping.');
    return;
  }

  const passwordHash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
    'admin',
    passwordHash,
    'admin'
  );
  console.log('Created admin user (username: admin, password: admin123)');
}

const sampleBooks = [
  {
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    category: 'Fiction',
    isbn: '9780061122415',
    price: 1200,
    stock_quantity: 20,
    reorder_threshold: 5,
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780062315007-M.jpg'
  },
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    category: 'Self-Help',
    isbn: '9780735211292',
    price: 1800,
    stock_quantity: 15,
    reorder_threshold: 5,
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780735211292-M.jpg'
  },
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    category: 'Technology',
    isbn: '9780132350884',
    price: 3500,
    stock_quantity: 3,
    reorder_threshold: 5,
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg'
  },
  {
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    category: 'History',
    isbn: '9780062316097',
    price: 2200,
    stock_quantity: 10,
    reorder_threshold: 4,
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780062316097-M.jpg'
  },
  {
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    category: 'Fantasy',
    isbn: '9780547928227',
    price: 1500,
    stock_quantity: 2,
    reorder_threshold: 5,
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780547928227-M.jpg'
  },
  {
    title: 'Rich Dad Poor Dad',
    author: 'Robert Kiyosaki',
    category: 'Finance',
    isbn: '9781612680194',
    price: 1600,
    stock_quantity: 25,
    reorder_threshold: 5,
    cover_image: 'https://covers.openlibrary.org/b/isbn/9781612680194-M.jpg'
  },
];

function seedBooks() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM books').get().c;
  if (count > 0) {
    const updateCover = db.prepare('UPDATE books SET cover_image = ? WHERE title = ?');
    for (const book of sampleBooks) {
      updateCover.run(book.cover_image, book.title);
    }
    console.log('Books already seeded; updated cover images for existing books.');
    return db.prepare('SELECT * FROM books ORDER BY id').all();
  }

  const insert = db.prepare(
    `INSERT INTO books (title, author, category, isbn, price, stock_quantity, reorder_threshold, cover_image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const book of sampleBooks) {
    insert.run(
      book.title,
      book.author,
      book.category,
      book.isbn,
      book.price,
      book.stock_quantity,
      book.reorder_threshold,
      book.cover_image
    );
  }

  console.log(`Seeded ${sampleBooks.length} sample books.`);
  return db.prepare('SELECT * FROM books ORDER BY id').all();
}

function seedSales(books) {
  const existingSales = db.prepare('SELECT COUNT(*) AS c FROM sales').get().c;
  if (existingSales > 0) {
    console.log('Sales already seeded, skipping.');
    return;
  }

  const byTitle = Object.fromEntries(books.map((b) => [b.title, b]));

  const sampleSales = [
    { bookTitle: 'The Alchemist', quantity: 3 },
    { bookTitle: 'The Alchemist', quantity: 2 },
    { bookTitle: 'Atomic Habits', quantity: 4 },
    { bookTitle: 'Clean Code', quantity: 2 },
  ];

  const insertSale = db.prepare('INSERT INTO sales (customer_id, total_amount) VALUES (NULL, ?)');
  const insertItem = db.prepare(
    `INSERT INTO sale_items (sale_id, book_id, quantity, unit_price, subtotal)
     VALUES (?, ?, ?, ?, ?)`
  );
  const decrementStock = db.prepare('UPDATE books SET stock_quantity = stock_quantity - ? WHERE id = ?');

  db.transaction(() => {
    for (const sale of sampleSales) {
      const book = byTitle[sale.bookTitle];
      if (!book || book.stock_quantity < sale.quantity) continue;

      const subtotal = book.price * sale.quantity;
      const saleResult = insertSale.run(subtotal);
      insertItem.run(saleResult.lastInsertRowid, book.id, sale.quantity, book.price, subtotal);
      decrementStock.run(sale.quantity, book.id);
    }
  });
  console.log(`Seeded ${sampleSales.length} sample sales.`);
}

upsertAdmin();
const books = seedBooks();
seedSales(books);

console.log('Seed complete.');
