import BookCover from './BookCover';
import { formatCurrency, formatDate } from '../utils/format';

export default function Receipt({ sale }) {
  if (!sale) return null;

  return (
    <div className="receipt-card">
      <div className="receipt-header">
        <div className="receipt-store-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h7" />
          </svg>
        </div>
        <h2 className="receipt-title">TSW LANKA BOOKSTORE</h2>
        <div className="receipt-sub">Point of Sale · Official Receipt</div>
      </div>

      <div className="receipt-divider-dashed" />

      <div className="receipt-meta-grid">
        <div>
          <span className="receipt-meta-label">Receipt No:</span>
          <span className="receipt-meta-val">#{sale.id}</span>
        </div>
        <div>
          <span className="receipt-meta-label">Date:</span>
          <span className="receipt-meta-val">{formatDate(sale.created_at)}</span>
        </div>
        <div>
          <span className="receipt-meta-label">Customer:</span>
          <span className="receipt-meta-val">{sale.customer_name || 'Walk-in Customer'}</span>
        </div>
        <div>
          <span className="receipt-meta-label">Payment:</span>
          <span className="receipt-meta-val">Cash / POS</span>
        </div>
      </div>

      <div className="receipt-divider-dashed" />

      <table className="receipt-items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style={{ textAlign: 'center' }}>Qty</th>
            <th style={{ textAlign: 'right' }}>Price</th>
            <th style={{ textAlign: 'right' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {(sale.items || []).map((item, idx) => (
            <tr key={item.book_id ?? idx}>
              <td>
                <div className="receipt-item-row">
                  <BookCover
                    src={item.cover_image}
                    title={item.title ?? item.book_title ?? 'Book'}
                    size="xs"
                  />
                  <span className="receipt-item-title">{item.title ?? item.book_title}</span>
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>{item.quantity ?? item.qty}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-divider-dashed" />

      <div className="receipt-summary">
        <div className="receipt-summary-line">
          <span>Total Items:</span>
          <span>
            {(sale.items || []).reduce((acc, it) => acc + (it.quantity ?? it.qty ?? 0), 0)}
          </span>
        </div>
        <div className="receipt-total-row">
          <span>GRAND TOTAL</span>
          <span className="receipt-total-amount">{formatCurrency(sale.total_amount)}</span>
        </div>
      </div>

      <div className="receipt-footer">
        <p>Thank you for shopping at TSW Lanka Bookstore!</p>
        <p>Keep this receipt for returns within 7 days.</p>
        <button
          type="button"
          className="btn btn-secondary btn-sm print-hide"
          onClick={() => window.print()}
          style={{ marginTop: 12 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect width="12" height="8" x="6" y="14" />
          </svg>
          Print Receipt
        </button>
      </div>
    </div>
  );
}
