export default function StockBadge({ stock = 0, threshold = 5, showNumber = true }) {
  const qty = Number(stock);
  const reorder = Number(threshold);

  if (qty <= 0) {
    return (
      <span className="stock-badge stock-badge-out">
        <span className="stock-dot" />
        Out of Stock
      </span>
    );
  }

  if (qty <= reorder) {
    return (
      <span className="stock-badge stock-badge-low">
        <span className="stock-dot" />
        {showNumber ? `Low Stock (${qty})` : 'Low Stock'}
      </span>
    );
  }

  return (
    <span className="stock-badge stock-badge-in">
      <span className="stock-dot" />
      {showNumber ? `In Stock (${qty})` : 'In Stock'}
    </span>
  );
}
