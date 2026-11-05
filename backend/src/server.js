const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PORT, CORS_ORIGIN } = require('./config');
const { sendError } = require('./utils/errors');
const { createRateLimiter } = require('./middleware/rateLimiter');
const { getSwaggerHtml } = require('./docs/swaggerUi');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const customerRoutes = require('./routes/customers');
const saleRoutes = require('./routes/sales');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Global API Rate Limiter: 180 requests per minute
const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 180,
  message: 'API rate limit exceeded. Please wait a moment before sending more requests.',
});

app.use('/api', globalLimiter);

// OpenAPI Spec & Interactive Docs
const openApiSpecPath = path.join(__dirname, 'docs', 'openapi.json');
const getOpenApiJson = (req, res) => {
  if (fs.existsSync(openApiSpecPath)) {
    res.setHeader('Content-Type', 'application/json');
    return res.sendFile(openApiSpecPath);
  }
  return sendError(res, 404, 'NOT_FOUND', 'OpenAPI specification file not found');
};

app.get('/api/v1/openapi.json', getOpenApiJson);
app.get('/api/openapi.json', getOpenApiJson);

app.get(['/api/v1/docs', '/api/docs', '/docs'], (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getSwaggerHtml('/api/v1/openapi.json'));
});

// Primary Versioned Endpoints (v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/books', bookRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/reports', reportRoutes);

// Backward Compatibility Aliases (mounted to same routes)
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// 404 handler with standard error envelope
app.use((req, res) => {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
});

// Centralized error handler with standard error envelope
app.use((err, req, res, next) => {
  console.error(err);
  if (err && err.name === 'AppError') {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }
  sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Bookstore backend listening on port ${PORT}`);
    console.log(`OpenAPI 3.0 docs available at http://localhost:${PORT}/api/v1/docs`);
  });
}

module.exports = app;
