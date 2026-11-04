import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import BookCover from '../components/BookCover';
import StockBadge from '../components/StockBadge';
import { formatCurrency } from '../utils/format';

export default function Dashboard() {
  const [lowStock, setLowStock] = useState(null);
  const [bestSellers, setBestSellers] = useState(null);
  const [books, setBooks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([api.getLowStock(), api.getBestSellers(), api.getBooks()])
      .then(([ls, bs, bk]) => {
        if (!mounted) return;
        setLowStock(ls || []);
        setBestSellers(bs || []);
        setBooks(bk || []);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Error loading dashboard metrics');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const totalCatalogValue = useMemo(() => {
    return books.reduce((acc, b) => acc + (b.price || 0) * (b.stock_quantity || 0), 0);
  }, [books]);

  return (
    <div className="page-container dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Operations Dashboard</h1>
          <p className="page-subtitle">Real-time inventory levels, sales velocity, and low-stock alerts</p>
        </div>
        <div className="header-actions">
          <Link to="/new-sale" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.1" />
            </svg>
            Open POS Sale
          </Link>
          <Link to="/books" className="btn btn-secondary">
            Manage Books
          </Link>
        </div>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {/* KPI Overview Metrics */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Titles in Catalog</div>
          <div className="stat-value">{books.length}</div>
          <div className="stat-hint">Active stock titles</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Low Stock Alerts</div>
          <div className="stat-value text-amber">{lowStock ? lowStock.length : '—'}</div>
          <div className="stat-hint">Items requiring replenishment</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Best Selling Titles</div>
          <div className="stat-value text-indigo">{bestSellers ? bestSellers.length : '—'}</div>
          <div className="stat-hint">Top velocity books</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Inventory Value</div>
          <div className="stat-value">{formatCurrency(totalCatalogValue)}</div>
          <div className="stat-hint">Stock × retail price</div>
        </div>
      </div>

      {/* Dashboard Sections Grid */}
      <div className="dashboard-grid">
        {/* Section 1: Low Stock Alerts */}
        <section className="card dashboard-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Low Stock Alerts
              </h2>
              <div className="card-section-sub">Books at or below reorder threshold</div>
            </div>
            {lowStock && lowStock.length > 0 && (
              <span className="badge-warning-pill">{lowStock.length} alert{lowStock.length > 1 ? 's' : ''}</span>
            )}
          </div>

          {lowStock === null ? (
            <div className="loading-state">
              <div className="spinner-sm" />
              <p>Checking stock levels...</p>
            </div>
          ) : lowStock.length === 0 ? (
            <div className="empty-state-mini">
              <div className="text-emerald">✓ All books are comfortably above reorder threshold.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>Cover</th>
                    <th>Book Details</th>
                    <th>Price</th>
                    <th>Current Stock</th>
                    <th>Reorder Level</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <BookCover src={b.cover_image} title={b.title} size="sm" />
                      </td>
                      <td>
                        <div className="cell-title">{b.title}</div>
                        <div className="cell-sub">{b.author || 'Unknown'} {b.category ? `· ${b.category}` : ''}</div>
                      </td>
                      <td className="cell-price">{formatCurrency(b.price)}</td>
                      <td>
                        <StockBadge stock={b.stock_quantity} threshold={b.reorder_threshold} />
                      </td>
                      <td className="text-muted">{b.reorder_threshold} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 2: Best Sellers with Book Cover Thumbnails */}
        <section className="card dashboard-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                Best Sellers
              </h2>
              <div className="card-section-sub">Highest quantity sold titles</div>
            </div>
            <Link to="/sales" className="btn btn-ghost btn-sm">
              View Sales
            </Link>
          </div>

          {bestSellers === null ? (
            <div className="loading-state">
              <div className="spinner-sm" />
              <p>Aggregating sales data...</p>
            </div>
          ) : bestSellers.length === 0 ? (
            <div className="empty-state-mini">
              <p>No sales recorded yet. Process sales in the POS to see top sellers.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th style={{ width: 56 }}>Cover</th>
                    <th>Title & Author</th>
                    <th>Price</th>
                    <th style={{ textAlign: 'center' }}>Units Sold</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {bestSellers.map((b, idx) => {
                    const sold = b.total_sold ?? b.quantity_sold ?? b.total_quantity ?? b.quantity ?? 0;
                    return (
                      <tr key={b.id}>
                        <td>
                          <span className={`rank-badge rank-${idx + 1}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td>
                          <BookCover src={b.cover_image} title={b.title} size="sm" />
                        </td>
                        <td>
                          <div className="cell-title">{b.title}</div>
                          <div className="cell-sub">{b.author || 'Unknown'} {b.category ? `· ${b.category}` : ''}</div>
                        </td>
                        <td className="cell-price">{formatCurrency(b.price)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="sold-count-pill">{sold} copies</span>
                        </td>
                        <td>
                          <StockBadge stock={b.stock_quantity} threshold={b.reorder_threshold} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
