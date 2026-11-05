const BASE_URL = import.meta.env.VITE_API_URL || '';

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

function unwrapList(result) {
  if (result && Array.isArray(result.data)) {
    return result.data;
  }
  return result;
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
    let message = `Request failed (${res.status})`;
    if (data) {
      if (typeof data.error === 'string') {
        message = data.error;
      } else if (data.error && typeof data.error === 'object') {
        message = data.error.message || message;
        if (Array.isArray(data.error.details) && data.error.details.length > 0) {
          const detailIssues = data.error.details.map((d) => d.issue || `${d.field}: ${d.issue}`).join(', ');
          message = `${message}: ${detailIssues}`;
        }
      } else if (data.message) {
        message = data.message;
      }
    }
    throw new ApiError(message, res.status, data);
  }

  return data;
}

export const api = {
  login: (username, password) =>
    request('/api/v1/auth/login', { method: 'POST', body: { username, password }, auth: false }),

  getBooks: (search = '', options = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    const qs = params.toString();
    return request(`/api/v1/books${qs ? `?${qs}` : ''}`).then(unwrapList);
  },
  createBook: (book) => request('/api/v1/books', { method: 'POST', body: book }),
  updateBook: (id, book) => request(`/api/v1/books/${id}`, { method: 'PUT', body: book }),
  patchBook: (id, book) => request(`/api/v1/books/${id}`, { method: 'PATCH', body: book }),
  deleteBook: (id) => request(`/api/v1/books/${id}`, { method: 'DELETE' }),

  getCustomers: () => request('/api/v1/customers').then(unwrapList),
  getCustomer: (id) => request(`/api/v1/customers/${id}`),
  createCustomer: (customer) => request('/api/v1/customers', { method: 'POST', body: customer }),

  createSale: (sale) => request('/api/v1/sales', { method: 'POST', body: sale }),
  getSales: () => request('/api/v1/sales').then(unwrapList),
  getSale: (id) => request(`/api/v1/sales/${id}`),

  getLowStock: () => request('/api/v1/reports/low-stock').then(unwrapList),
  getBestSellers: () => request('/api/v1/reports/best-sellers').then(unwrapList),
};
