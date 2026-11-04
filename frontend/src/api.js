const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new ApiError('Session expired. Please log in again.', 401, null);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data;
}

export const api = {
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: { username, password }, auth: false }),

  getBooks: (search = '') =>
    request(`/api/books${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createBook: (book) => request('/api/books', { method: 'POST', body: book }),
  updateBook: (id, book) => request(`/api/books/${id}`, { method: 'PUT', body: book }),
  deleteBook: (id) => request(`/api/books/${id}`, { method: 'DELETE' }),

  getCustomers: () => request('/api/customers'),
  createCustomer: (customer) => request('/api/customers', { method: 'POST', body: customer }),

  createSale: (sale) => request('/api/sales', { method: 'POST', body: sale }),
  getSales: () => request('/api/sales'),
  getSale: (id) => request(`/api/sales/${id}`),

  getLowStock: () => request('/api/reports/low-stock'),
  getBestSellers: () => request('/api/reports/best-sellers'),
};
