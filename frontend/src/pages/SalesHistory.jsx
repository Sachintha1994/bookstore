import { useEffect, useState } from 'react';
import { api } from '../api';
import Receipt from '../components/Receipt';
import { formatCurrency, formatDate } from '../utils/format';

export default function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    api.getSales()
      .then(setSales)
      .catch((err) => setError(err.message || 'Failed to load sales history'))
      .finally(() => setLoading(false));
  }, []);

  async function viewReceipt(saleId) {
    setDetailError('');
    setDetailLoading(true);
    try {
      const saleDetail = await api.getSale(saleId);
      // Fetch books catalog to attach cover images to items if available
      try {
        const books = await api.getBooks();
        if (saleDetail && saleDetail.items) {
          saleDetail.items = saleDetail.items.map((it) => {
            const matched = books.find((b) => b.id === it.book_id);
            return {
              ...it,
              cover_image: matched?.cover_image || null,
            };
          });
        }
      } catch {
        // Continue even if books fetch fails
      }
      setSelected(saleDetail);
    } catch (err) {
      setDetailError(err.message || 'Failed to load receipt details');
    } finally {
      setDetailLoading(false);
    }
  }

  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="page-subtitle">Past orders, receipts, and revenue records</p>
        </div>
        <div className="revenue-pill">
          Total Recorded: <strong>{formatCurrency(totalRevenue)}</strong>
        </div>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading sales history...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="card empty-state">
          <h3>No sales records found</h3>
          <p>When you complete a sale in New Sale POS, it will appear here.</p>
        </div>
      ) : (
        <div className="table-responsive card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Receipt #</th>
                <th>Customer</th>
                <th>Date & Time</th>
                <th>Total Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono" style={{ fontWeight: 600 }}>#{s.id}</td>
                  <td>
                    <div className="customer-cell">
                      <div className="customer-avatar">
                        {(s.customer_name || 'W').charAt(0).toUpperCase()}
                      </div>
                      <span>{s.customer_name || 'Walk-in Customer'}</span>
                    </div>
                  </td>
                  <td className="text-muted">{formatDate(s.created_at)}</td>
                  <td className="cell-price">{formatCurrency(s.total_amount)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => viewReceipt(s.id)}
                      disabled={detailLoading}
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal modal-receipt-overlay" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>Receipt #{selected.id}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            {detailError && <div className="error-banner" role="alert">{detailError}</div>}
            <Receipt sale={selected} />
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
