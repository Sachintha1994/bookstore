const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/server');
const openApiSpec = require('../src/docs/openapi.json');

let server;
let baseUrl;
let token;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('TSW Lanka Bookstore API - OpenAPI Contract & Standards Suite', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('1. OpenAPI Specification & Documentation Endpoints', () => {
    it('serves valid OpenAPI 3.0 specification at /api/v1/openapi.json', async () => {
      const res = await request('/api/v1/openapi.json');
      assert.equal(res.status, 200);
      assert.equal(res.body.openapi, '3.0.3');
      assert.ok(res.body.paths['/books']);
      assert.ok(res.body.components.schemas.ErrorEnvelope);
    });

    it('serves OpenAPI specification via backward compatible /api/openapi.json', async () => {
      const res = await request('/api/openapi.json');
      assert.equal(res.status, 200);
      assert.equal(res.body.openapi, '3.0.3');
    });

    it('serves interactive Swagger UI HTML at /api/v1/docs and /api/docs', async () => {
      const res1 = await request('/api/v1/docs');
      assert.equal(res1.status, 200);
      assert.ok(res1.body.includes('SwaggerUIBundle'));

      const res2 = await request('/api/docs');
      assert.equal(res2.status, 200);
      assert.ok(res2.body.includes('SwaggerUIBundle'));
    });
  });

  describe('2. Security & Rate Limiting Headers', () => {
    it('sets standard X-RateLimit-* headers on all responses', async () => {
      const res = await request('/api/v1/books');
      assert.ok(res.headers['x-ratelimit-limit'], 'Must include X-RateLimit-Limit');
      assert.ok(res.headers['x-ratelimit-remaining'] !== undefined, 'Must include X-RateLimit-Remaining');
      assert.ok(res.headers['x-ratelimit-reset'], 'Must include X-RateLimit-Reset');
    });

    it('rejects unauthenticated requests with 401 UNAUTHORIZED envelope', async () => {
      const res = await request('/api/v1/books');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
      assert.ok(res.body.error.message);
      assert.ok(Array.isArray(res.body.error.details));
    });
  });

  describe('3. Authentication Flow (/api/v1/auth/login)', () => {
    it('validates missing credentials with 400 INVALID_INPUT and field-level details', async () => {
      const res = await request('/api/v1/auth/login', {
        method: 'POST',
        body: {},
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'INVALID_INPUT');
      assert.ok(res.body.error.details.some((d) => d.field === 'username'));
      assert.ok(res.body.error.details.some((d) => d.field === 'password'));
    });

    it('rejects incorrect credentials with 401 UNAUTHORIZED', async () => {
      const res = await request('/api/v1/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'wrongpassword' },
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('authenticates valid admin credentials and returns JWT token', async () => {
      const res = await request('/api/v1/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'admin123' },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.token);
      token = res.body.token;
    });
  });

  describe('4. RESTful CRUD & Error Envelopes (/api/v1/books)', () => {
    let createdBookId;

    it('validates book creation failure with 400 and field details', async () => {
      const res = await request('/api/v1/books', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { price: -50 },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'INVALID_INPUT');
      assert.ok(res.body.error.details.some((d) => d.field === 'title'));
      assert.ok(res.body.error.details.some((d) => d.field === 'price'));
    });

    it('creates a new book returning 201 with Location header and resource', async () => {
      const res = await request('/api/v1/books', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          title: 'Contract Test Book',
          author: 'Test Author',
          category: 'Technology',
          isbn: '9781234567890',
          price: 2500,
          stock_quantity: 12,
          reorder_threshold: 3,
          cover_image: 'https://example.com/test.jpg',
        },
      });
      assert.equal(res.status, 201);
      assert.ok(res.headers.location);
      assert.ok(res.body.id);
      assert.equal(res.body.title, 'Contract Test Book');
      createdBookId = res.body.id;
    });

    it('retrieves single book by ID via GET /books/:id with 200', async () => {
      const res = await request(`/api/v1/books/${createdBookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.id, createdBookId);
      assert.equal(res.body.title, 'Contract Test Book');
    });

    it('returns 404 NOT_FOUND for non-existent book ID', async () => {
      const res = await request('/api/v1/books/999999', {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'NOT_FOUND');
    });

    it('partially updates book via PATCH /books/:id', async () => {
      const res = await request(`/api/v1/books/${createdBookId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: { price: 2900 },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.price, 2900);
      assert.equal(res.body.title, 'Contract Test Book');
    });

    it('supports pagination query ?page=1&limit=2 returning pagination meta', async () => {
      const res = await request('/api/v1/books?page=1&limit=2', {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.pagination);
      assert.equal(res.body.pagination.page, 1);
      assert.equal(res.body.pagination.limit, 2);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.headers['x-total-count']);
    });

    it('deletes book via DELETE /books/:id returning 204 No Content', async () => {
      const res = await request(`/api/v1/books/${createdBookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 204);
    });

    it('prevents deletion of book with sales returning 409 CONFLICT', async () => {
      // Book ID 1 (The Alchemist) has recorded sales in seeded DB
      const res = await request('/api/v1/books/1', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, 'CONFLICT');
    });
  });

  describe('5. Backward Compatibility Verification', () => {
    it('allows calls to legacy unversioned /api/books with identical data', async () => {
      const res = await request('/api/books', {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length > 0);
    });
  });
});
