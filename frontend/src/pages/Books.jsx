import { useEffect, useState, useMemo } from 'react';
import { api } from '../api';
import BookCover from '../components/BookCover';
import StockBadge from '../components/StockBadge';
import { formatCurrency } from '../utils/format';

const emptyForm = {
  title: '',
  author: '',
  category: '',
  isbn: '',
  price: '',
  stock_quantity: '',
  reorder_threshold: '5',
  cover_image: '',
};

export default function Books() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [editing, setEditing] = useState(null); // 'new' | book object | null
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadBooks(searchTerm = search) {
    setLoading(true);
    setError('');
    try {
      const data = await api.getBooks(searchTerm);
      setBooks(data);
    } catch (err) {
      setError(err.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.getBooks('')
      .then((data) => {
        if (active) {
          setBooks(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load books');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    books.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set).sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (selectedCategory !== 'ALL' && b.category !== selectedCategory) return false;
      if (stockFilter === 'IN_STOCK' && b.stock_quantity <= b.reorder_threshold) return false;
      if (stockFilter === 'LOW_STOCK' && (b.stock_quantity <= 0 || b.stock_quantity > b.reorder_threshold)) return false;
      if (stockFilter === 'OUT_OF_STOCK' && b.stock_quantity > 0) return false;
      return true;
    });
  }, [books, selectedCategory, stockFilter]);

  const stats = useMemo(() => {
    const total = books.length;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    books.forEach((b) => {
      if (b.stock_quantity <= 0) outOfStock++;
      else if (b.stock_quantity <= b.reorder_threshold) lowStock++;
      else inStock++;
    });
    return { total, inStock, lowStock, outOfStock };
  }, [books]);

  function openAdd() {
    setForm(emptyForm);
    setFormError('');
    setEditing('new');
  }

  function openEdit(book) {
    setForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || '',
      isbn: book.isbn || '',
      price: book.price !== undefined ? String(book.price) : '',
      stock_quantity: book.stock_quantity !== undefined ? String(book.stock_quantity) : '',
      reorder_threshold: book.reorder_threshold !== undefined ? String(book.reorder_threshold) : '5',
      cover_image: book.cover_image || '',
    });
    setFormError('');
    setEditing(book);
  }

  function closeModal() {
    setEditing(null);
  }

  function autoFillCoverFromIsbn() {
    const cleanIsbn = (form.isbn || '').replace(/[^0-9X]/gi, '');
    if (!cleanIsbn) {
      setFormError('Please enter an ISBN first (e.g. 9780061122415) to auto-fetch cover.');
      return;
    }
    const coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`;
    setForm((prev) => ({ ...prev, cover_image: coverUrl }));
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {
      title: form.title.trim(),
      author: form.author.trim() || null,
      category: form.category.trim() || null,
      isbn: form.isbn.trim() || null,
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity),
      reorder_threshold: Number(form.reorder_threshold),
      cover_image: form.cover_image.trim() || null,
    };
    try {
      if (editing === 'new') {
        await api.createBook(payload);
      } else {
        await api.updateBook(editing.id, payload);
      }
      closeModal();
      await loadBooks();
    } catch (err) {
      setFormError(err.message || 'Error saving book');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(book) {
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteBook(book.id);
      await loadBooks();
    } catch (err) {
      setError(err.message || 'Error deleting book');
    }
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Book Catalog & Inventory</h1>
          <p className="page-subtitle">Manage books, inventory levels, and front cover visuals</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAdd}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add New Book
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Titles</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-hint">Active in catalog</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Stock</div>
          <div className="stat-value text-emerald">{stats.inStock}</div>
          <div className="stat-hint">Healthy inventory</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock Alerts</div>
          <div className="stat-value text-amber">{stats.lowStock}</div>
          <div className="stat-hint">At or below reorder threshold</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Out of Stock</div>
          <div className="stat-value text-rose">{stats.outOfStock}</div>
          <div className="stat-hint">Needs urgent restock</div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="toolbar-card">
        <form
          className="search-group"
          onSubmit={(e) => {
            e.preventDefault();
            loadBooks(search);
          }}
        >
          <div className="search-input-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Search by title, author, category, or ISBN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
          {search && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSearch('');
                loadBooks('');
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="toolbar-filters">
          <select
            className="form-control"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by Category"
          >
            <option value="ALL">All Categories ({books.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="form-control"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            aria-label="Filter by Stock"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>

          <div className="view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
              aria-label="Card Grid View"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
              aria-label="Table View"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading catalog...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="m9 9 3 3 6-6" />
            </svg>
          </div>
          <h3>No books found</h3>
          <p>Try adjusting your search query or filter settings.</p>
          <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setSelectedCategory('ALL'); setStockFilter('ALL'); loadBooks(''); }}>
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="book-grid">
          {filteredBooks.map((b) => (
            <div key={b.id} className="book-card">
              <div className="book-card-cover-wrapper">
                <BookCover src={b.cover_image} title={b.title} size="lg" />
              </div>
              <div className="book-card-body">
                <div className="book-card-meta">
                  {b.category && <span className="category-pill">{b.category}</span>}
                  <StockBadge stock={b.stock_quantity} threshold={b.reorder_threshold} />
                </div>
                <h3 className="book-card-title" title={b.title}>{b.title}</h3>
                <div className="book-card-author">by {b.author || 'Unknown Author'}</div>
                {b.isbn && <div className="book-card-isbn">ISBN: {b.isbn}</div>}
                
                <div className="book-card-price-row">
                  <div className="book-card-price">{formatCurrency(b.price)}</div>
                  <div className="book-card-stock-qty">Stock: <strong>{b.stock_quantity}</strong></div>
                </div>

                <div className="book-card-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Edit
                  </button>
                  <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => handleDelete(b)} title="Delete book">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="table-responsive card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 64 }}>Cover</th>
                <th>Title & Author</th>
                <th>Category</th>
                <th>ISBN</th>
                <th>Price</th>
                <th>Inventory Status</th>
                <th>Reorder At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((b) => (
                <tr key={b.id}>
                  <td>
                    <BookCover src={b.cover_image} title={b.title} size="sm" />
                  </td>
                  <td>
                    <div className="cell-title">{b.title}</div>
                    <div className="cell-sub">{b.author || 'Unknown'}</div>
                  </td>
                  <td>
                    {b.category ? <span className="category-pill">{b.category}</span> : '—'}
                  </td>
                  <td className="font-mono text-xs">{b.isbn || '—'}</td>
                  <td className="cell-price">{formatCurrency(b.price)}</td>
                  <td>
                    <StockBadge stock={b.stock_quantity} threshold={b.reorder_threshold} />
                  </td>
                  <td className="text-muted">{b.reorder_threshold}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => handleDelete(b)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal with Immediate Live Cover Preview & Prominent ISBN Auto-Fetch */}
      {editing && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>{editing === 'new' ? 'Add New Book' : `Edit Book: ${form.title || 'Untitled'}`}</h2>
              <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="Close modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {formError && <div className="error-banner" role="alert">{formError}</div>}

            <form onSubmit={handleSubmit} className="book-form-layout">
              {/* Left Column: Live Cover Preview */}
              <div className="form-cover-preview-column">
                <div className="cover-preview-label">Live Cover Preview</div>
                <div className="cover-preview-box">
                  <BookCover
                    src={form.cover_image}
                    title={form.title || 'Book Title'}
                    size="xl"
                  />
                </div>
                <div className="cover-preview-caption">
                  {form.cover_image ? (
                    <span className="text-emerald">✓ Cover preview loaded</span>
                  ) : (
                    <span className="text-muted">No image URL set. Fallback cover shown.</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm auto-cover-btn"
                  onClick={autoFillCoverFromIsbn}
                  title="Fetch cover from Open Library using current ISBN"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    <line x1="16" y1="5" x2="22" y2="5" />
                    <line x1="19" y1="2" x2="19" y2="8" />
                  </svg>
                  Auto-Fetch Cover
                </button>
              </div>

              {/* Right Column: Form Fields */}
              <div className="form-fields-column">
                <div className="form-group">
                  <label htmlFor="book-title">
                    Book Title <span className="required">*</span>
                  </label>
                  <input
                    id="book-title"
                    className="form-control"
                    required
                    placeholder="e.g. The Alchemist"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="book-author">
                      Author <span className="required">*</span>
                    </label>
                    <input
                      id="book-author"
                      className="form-control"
                      required
                      placeholder="e.g. Paulo Coelho"
                      value={form.author}
                      onChange={(e) => setForm({ ...form, author: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="book-category">Category</label>
                    <input
                      id="book-category"
                      className="form-control"
                      placeholder="e.g. Fiction, Self-Help"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="book-isbn">
                      ISBN
                      <span className="label-hint"> (Use to fetch cover)</span>
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        id="book-isbn"
                        className="form-control"
                        placeholder="e.g. 9780061122415"
                        value={form.isbn}
                        onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={autoFillCoverFromIsbn}
                        title="Auto-fetch cover from Open Library using this ISBN"
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        Fetch Cover
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="book-price">
                      Price (Rs.) <span className="required">*</span>
                    </label>
                    <input
                      id="book-price"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      className="form-control"
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="book-stock">
                      Stock Quantity <span className="required">*</span>
                    </label>
                    <input
                      id="book-stock"
                      type="number"
                      min="0"
                      step="1"
                      required
                      className="form-control"
                      placeholder="0"
                      value={form.stock_quantity}
                      onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="book-threshold">
                      Reorder Threshold <span className="required">*</span>
                    </label>
                    <input
                      id="book-threshold"
                      type="number"
                      min="0"
                      step="1"
                      required
                      className="form-control"
                      placeholder="5"
                      value={form.reorder_threshold}
                      onChange={(e) => setForm({ ...form, reorder_threshold: e.target.value })}
                    />
                  </div>
                </div>

                {/* Cover Image Input Field */}
                <div className="form-group">
                  <label htmlFor="book-cover-image">
                    Cover Image URL
                    <span className="label-hint"> (JPG, PNG, or Open Library link)</span>
                  </label>
                  <div className="input-with-clear">
                    <input
                      id="book-cover-image"
                      type="url"
                      className="form-control"
                      placeholder="https://covers.openlibrary.org/b/isbn/9780061122415-M.jpg"
                      value={form.cover_image}
                      onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                    />
                    {form.cover_image && (
                      <button
                        type="button"
                        className="input-clear-btn"
                        onClick={() => setForm({ ...form, cover_image: '' })}
                        title="Clear cover URL"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="field-hint">
                    Live preview renders immediately on the left. If left blank, an elegant styled placeholder is displayed.
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editing === 'new' ? 'Add Book' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
