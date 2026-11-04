# Bookstore Management — Frontend

Web frontend for the TSW Lanka small-scale Bookstore Management Solution. React + Vite, plain fetch and React state/context (no extra state library).

## Setup

```bash
npm install
cp .env.example .env   # already present with a working default; edit if your backend runs elsewhere
npm run dev
```

The app runs at http://localhost:5173 and expects the backend at the URL in `VITE_API_URL` (default `http://localhost:4000`). Start Dinesh's backend first.

## Test login

Seeded test account: **admin / admin123**

## Build

```bash
npm run build
```

Outputs a production build to `dist/`.

## Pages

- **Login** — authenticates against `/api/auth/login`, stores the JWT in `localStorage`, redirects unauthenticated/expired-session users back to login.
- **Dashboard** — low-stock alerts and best-sellers.
- **Books** — list, search, add/edit (modal form), delete (with confirm).
- **New Sale** — add books to a cart with quantity, optionally pick or quickly add a customer, submit to create the sale, then view the receipt. Shows the backend's stock-exceeded error inline if a sale is rejected.
- **Sales History** — list of past sales, click to view the receipt.
- **Customers** — list + add form.
