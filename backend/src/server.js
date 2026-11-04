const express = require('express');
const cors = require('cors');
const { PORT, CORS_ORIGIN } = require('./config');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const customerRoutes = require('./routes/customers');
const saleRoutes = require('./routes/sales');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Bookstore backend listening on port ${PORT}`);
});
