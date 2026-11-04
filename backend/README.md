# Bookstore Management Solution — Backend

Node.js + Express API backed by SQLite (`better-sqlite3`). No database server required — the file database is created automatically at `backend/data/bookstore.db`.

## Setup

```bash
cd backend
npm install
npm run seed
npm start
```

- `npm install` — installs dependencies.
- `npm run seed` — creates tables (if missing) and seeds an admin user plus sample books/sales. Safe to re-run (idempotent — skips if data already exists).
- `npm start` — starts the API server on **port 4000**.
- `npm run dev` — same as `start` but with `nodemon` for auto-reload during development.

## Admin login

```
username: admin
password: admin123
```

## Configuration

- Port is fixed at **4000** (frontend expects `http://localhost:4000`).
- CORS is enabled for `http://localhost:5173`.
- Override via environment variables if needed: `PORT`, `JWT_SECRET`, `CORS_ORIGIN`.

## API

All routes except `/api/auth/login` require header `Authorization: Bearer <token>`.

- `POST /api/auth/login` `{username, password}` → `{token}`
- `GET /api/books?search=` → array of books
- `POST /api/books` `{title, author, category, isbn, price, stock_quantity, reorder_threshold}` → created book
- `PUT /api/books/:id` → updated book
- `DELETE /api/books/:id` → 204
- `GET /api/customers` → array
- `POST /api/customers` `{name, phone, email}` → created customer
- `POST /api/sales` `{customer_id?, items:[{book_id, quantity}]}` → full sale object with `items` and `total_amount`. Validates stock per item (400, no partial apply, if any item exceeds current stock), decrements stock, snapshots unit price, all in one transaction.
- `GET /api/sales` → recent sales summary (`id, customer_name, total_amount, created_at`)
- `GET /api/sales/:id` → full sale detail with line items for receipt rendering
- `GET /api/reports/low-stock` → books where `stock_quantity <= reorder_threshold`
- `GET /api/reports/best-sellers` → top 10 books by total quantity sold
