# TSW Lanka — RESTful API & Client Contract Agreement
**Conforming to the TSW Lanka Company `api-design` Standard**  
**Lead Backend Developer**: Dinesh Rajapaksha  
**Solutions Architect**: Ada Perera  
**Frontend & Web Developer**: Nadeesha Silva  
**Mobile App Developer**: Kavindu Fernando  
**Specification Version**: 1.0.0 (OpenAPI 3.0.3)  
**Last Updated**: 2026-11-05  

---

## 1. Executive Summary & Design Principles

This document establishes the official API contract agreement for all backend services, web applications, and mobile clients at TSW Lanka. Conforming to the company-wide **`api-design`** standard, all endpoints adhere to:
1. **RESTful Resource URIs & Versioning**: Version prefix `/api/v1` with hierarchical, plural resource naming. Backward compatibility aliases at `/api` are maintained for legacy clients.
2. **OpenAPI 3.0 Documentation**: Complete machine-readable OpenAPI 3.0 specification available at `/api/v1/openapi.json` and interactive Swagger UI at `/api/v1/docs`.
3. **Standardized Error Envelopes**: Consistent JSON error structures with machine-readable error codes, human-readable explanations, and field-level issue details.
4. **Standard HTTP Status Codes**: Explicit use of standard status codes (200, 201 with `Location` header, 204, 400, 401, 403, 404, 409, 429, 500).
5. **Security & Rate Limiting**: Stateless JWT Bearer authorization (`Authorization: Bearer <token>`), with mandatory rate limiting headers on all responses (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) and 429 responses.
6. **Pagination**: Structured collection pagination via `?page=` and `?limit=` query parameters with metadata and headers.

---

## 2. Base URIs & Documentation Endpoints

| Environment / Service | Base URI | Description |
| :--- | :--- | :--- |
| **Primary Versioned API** | `/api/v1` | Production REST API for all web and mobile clients |
| **Legacy Compatibility Alias** | `/api` | Backward-compatible alias matching v1 endpoints |
| **Interactive OpenAPI UI (Swagger)** | `/api/v1/docs` (or `/api/docs`) | Full interactive browser documentation |
| **OpenAPI 3.0 JSON Spec** | `/api/v1/openapi.json` | Machine-readable schema for code generation & testing |
| **Health Check** | `/health` | Service liveness probe (`{ status: "ok", version: "1.0.0" }`) |

---

## 3. Security & Rate Limiting Contract

### 3.1 Authentication
- Public endpoints: `POST /api/v1/auth/login`, `/api/v1/docs`, `/api/v1/openapi.json`, `/health`.
- All other endpoints require a stateless JWT token sent in the standard HTTP header:
  ```http
  Authorization: Bearer <jwt_token>
  ```
- Issued tokens are signed with HMAC-SHA256 and valid for 12 hours. Payload contains:
  ```json
  { "id": 1, "username": "admin", "role": "admin" }
  ```

### 3.2 Rate Limiting Headers
Every request returns standard sliding-window rate limit headers:
- `X-RateLimit-Limit`: Maximum requests permitted in the sliding window (e.g. 180 for API endpoints, 30 for login).
- `X-RateLimit-Remaining`: Number of remaining requests in the active window.
- `X-RateLimit-Reset`: UTC Unix timestamp (in seconds) when the sliding window resets.

When the rate limit is exceeded:
- **HTTP Status**: `429 Too Many Requests`
- **Header**: `Retry-After: <seconds>`
- **Body**: Standard Error Envelope with code `RATE_LIMIT_EXCEEDED`.

---

## 4. Standardized Error Response Envelope

All error responses across 4xx and 5xx return a unified envelope structure:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed",
    "details": [
      {
        "field": "title",
        "issue": "title is required and cannot be empty"
      },
      {
        "field": "price",
        "issue": "price must be a valid non-negative number"
      }
    ]
  }
}
```

### Standard Error Code Dictionary
| Status Code | Error Code | Description / Typical Cause |
| :---: | :--- | :--- |
| **400** | `INVALID_INPUT` | Schema or field validation failure. `details` array contains specific fields. |
| **401** | `UNAUTHORIZED` | Missing, invalid, or expired Bearer token. |
| **403** | `FORBIDDEN` | Authenticated user lacks required role or permission. |
| **404** | `NOT_FOUND` | Target resource ID or route does not exist. |
| **409** | `CONFLICT` | Business rule or constraint conflict (e.g. deleting a book with sales). |
| **429** | `RATE_LIMIT_EXCEEDED` | Client exceeded sliding window request quota. |
| **500** | `INTERNAL_ERROR` | Uncaught server exception or database error. |

---

## 5. Collection Pagination Contract

Collection endpoints (`/api/v1/books`, `/api/v1/customers`, `/api/v1/sales`) support pagination:

### Query Parameters
- `page` (integer, optional, default `1`): 1-indexed page number.
- `limit` (integer, optional, default `20`, max `100`): Items per page.

### Response Format (When Paginated)
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Response Headers
- `X-Total-Count`: Total count of matching items.
- `X-Page`: Current page number.
- `X-Limit`: Items limit.
- `X-Total-Pages`: Total pages count.

*Backward Compatibility Note*: When neither `page` nor `limit` is specified in query parameters, the backend returns the raw array `[ ... ]` with the standard pagination headers attached, allowing legacy frontend/mobile code to operate without breakage.

---

## 6. Complete API Endpoint Specifications

### 6.1 Authentication

#### `POST /api/v1/auth/login`
- **Auth**: None (Public).
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response 400 / 401**: Standard Error Envelope.

---

### 6.2 Catalog Management (Books)

#### `GET /api/v1/books`
- **Auth**: Bearer Token.
- **Query Params**:
  - `search` (string, optional): Search keyword matching title, author, category, or ISBN.
  - `page` (integer, optional): Page number.
  - `limit` (integer, optional): Page limit.
- **Response 200 OK**: Array of Books or Paginated Envelope.

#### `GET /api/v1/books/:id`
- **Auth**: Bearer Token.
- **Response 200 OK**:
  ```json
  {
    "id": 1,
    "title": "The Alchemist",
    "author": "Paulo Coelho",
    "category": "Fiction",
    "isbn": "9780061122415",
    "price": 1200,
    "stock_quantity": 20,
    "reorder_threshold": 5,
    "cover_image": "https://covers.openlibrary.org/b/isbn/9780062315007-M.jpg",
    "created_at": "2026-11-04 22:15:00"
  }
  ```
- **Response 404 NOT_FOUND**: If book ID does not exist.

#### `POST /api/v1/books`
- **Auth**: Bearer Token.
- **Request Body**:
  ```json
  {
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "category": "Technology",
    "isbn": "9780132350884",
    "price": 3500,
    "stock_quantity": 10,
    "reorder_threshold": 5,
    "cover_image": "https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg"
  }
  ```
- **Response 201 Created**:
  - **Headers**: `Location: /api/v1/books/:id`
  - **Body**: Complete created Book object.
- **Response 400 INVALID_INPUT**: If title missing or price negative.

#### `PUT /api/v1/books/:id`
- **Auth**: Bearer Token.
- **Description**: Full update of existing book record.
- **Response 200 OK**: Updated Book object.

#### `PATCH /api/v1/books/:id`
- **Auth**: Bearer Token.
- **Description**: Partial update of specified book properties.
- **Response 200 OK**: Updated Book object.

#### `DELETE /api/v1/books/:id`
- **Auth**: Bearer Token.
- **Response 204 No Content**: Empty body on successful deletion.
- **Response 409 CONFLICT**:
  ```json
  {
    "error": {
      "code": "CONFLICT",
      "message": "Cannot delete a book with recorded sales.",
      "details": []
    }
  }
  ```

---

### 6.3 Customer Directory (POS)

#### `GET /api/v1/customers`
- **Auth**: Bearer Token.
- **Response 200 OK**: Array of Customers or Paginated Envelope.

#### `GET /api/v1/customers/:id`
- **Auth**: Bearer Token.
- **Response 200 OK**: Customer object `{ "id": 1, "name": "...", "phone": "...", "email": "..." }`.

#### `POST /api/v1/customers`
- **Auth**: Bearer Token.
- **Request Body**: `{ "name": "Nimal Perera", "phone": "0771234567", "email": "nimal@example.lk" }`
- **Response 201 Created**: Created customer object with `Location: /api/v1/customers/:id`.

---

### 6.4 Sales & Checkout Transactions

#### `POST /api/v1/sales`
- **Auth**: Bearer Token.
- **Description**: Atomic sales transaction execution. Automatically calculates subtotals, persists sale, and decrements stock.
- **Request Body**:
  ```json
  {
    "customer_id": 1,
    "items": [
      { "book_id": 1, "quantity": 2 },
      { "book_id": 2, "quantity": 1 }
    ]
  }
  ```
- **Response 201 Created**:
  - **Headers**: `Location: /api/v1/sales/:id`
  - **Body**:
    ```json
    {
      "id": 15,
      "customer_id": 1,
      "total_amount": 4200,
      "created_at": "2026-11-05 10:15:00",
      "items": [
        {
          "id": 31,
          "book_id": 1,
          "book_title": "The Alchemist",
          "quantity": 2,
          "unit_price": 1200,
          "subtotal": 2400
        },
        {
          "id": 32,
          "book_id": 2,
          "book_title": "Atomic Habits",
          "quantity": 1,
          "unit_price": 1800,
          "subtotal": 1800
        }
      ]
    }
    ```
- **Response 400 INVALID_INPUT**: If items array is empty, book not found, or stock is insufficient.

#### `GET /api/v1/sales`
- **Auth**: Bearer Token.
- **Response 200 OK**: Reverse chronological list of completed sales.

#### `GET /api/v1/sales/:id`
- **Auth**: Bearer Token.
- **Response 200 OK**: Complete sales transaction details including line items.

---

### 6.5 Reports & Analytics

#### `GET /api/v1/reports/low-stock`
- **Auth**: Bearer Token.
- **Response 200 OK**: Array of books where `stock_quantity <= reorder_threshold`.

#### `GET /api/v1/reports/best-sellers`
- **Auth**: Bearer Token.
- **Response 200 OK**: Top 10 best-selling books sorted by `total_sold DESC`.

---

## 7. Client Integration Guidelines

### 7.1 Web Frontend Integration (Nadeesha Silva)
The web frontend's API client (`src/api.js`) has been updated with:
1. Versioned endpoint paths (`/api/v1/...`).
2. Robust error parsing: extracts `error.message` and unrolls `error.details` field issues automatically into readable error strings.
3. Automatic list unwrapping: seamlessly accepts either `[ ... ]` or `{ data: [ ... ], pagination: { ... } }`.

### 7.2 Mobile App Integration (Kavindu Fernando)
For Flutter / React Native / Native Mobile:
1. Configure base URL to point to `/api/v1`.
2. Inspect `X-RateLimit-*` headers to gracefully display countdown timers or defer background sync when rate limits approach exhaustion.
3. Parse the standardized `error` envelope to bind validation errors directly to form input fields using `details[].field`.
4. Handle `401 UNAUTHORIZED` globally by clearing stored JWT and redirecting to the login screen.
5. Use `PATCH /api/v1/books/:id` for efficient mobile bandwidth usage when updating individual fields.
