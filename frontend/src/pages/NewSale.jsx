import { useEffect, useState, useMemo } from 'react';
import { api } from '../api';
import BookCover from '../components/BookCover';
import StockBadge from '../components/StockBadge';
import Receipt from '../components/Receipt';
import { formatCurrency } from '../utils/format';

export default function NewSale() {
  const [books, setBooks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]); // { book_id, title, price, quantity, cover_image, stock_quantity }
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [customerId, setCustomerId] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  function loadBooks() {
    api.getBooks().then(setBooks).catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadBooks();
    api.getCustomers().then(setCustomers).catch((err) => setError(err.message));
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
      const matchCat = selectedCategory === 'ALL' || b.category === selectedCategory;
      const term = search.toLowerCase().trim();
      const matchSearch =
        !term ||
        b.title.toLowerCase().includes(term) ||
        (b.author && b.author.toLowerCase().includes(term)) ||
        (b.isbn && b.isbn.toLowerCase().includes(term));
      return matchCat && matchSearch;
    });
  }, [books, selectedCategory, search]);

  function addToCart(book, quantityToAdd = 1) {
    if (book.stock_quantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.book_id === book.id);
      const currentQty = existing ? existing.quantity : 0;
      const targetQty = currentQty + quantityToAdd;

      if (targetQty > book.stock_quantity) {
        setError(`Cannot add more than ${book.stock_quantity} available in stock for "${book.title}".`);
        return prev;
      }

      setError('');
      if (existing) {
        return prev.map((item) =>
          item.book_id === book.id ? { ...item, quantity: targetQty } : item
        );
      }
      return [
        ...prev,
        {
          book_id: book.id,
          title: book.title,
          price: book.price,
          quantity: quantityToAdd,
          cover_image: book.cover_image,
          stock_quantity: book.stock_quantity,
        },
      ];
    });
  }

  function updateCartQty(bookId, delta) {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.book_id === bookId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stock_quantity) {
              setError(`Maximum available stock for "${item.title}" is ${item.stock_quantity}.`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean);
    });
  }

  function removeFromCart(bookId) {
    setCart((prev) => prev.filter((item) => item.book_id !== bookId));
  }

  function clearCart() {
    setCart([]);
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    try {
      const customer = await api.createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        email: newCustomerEmail.trim() || undefined,
      });
      setCustomers((prev) => [...prev, customer]);
      setCustomerId(String(customer.id));
      setAddingCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
    } catch (err) {
      setError(err.message || 'Failed to create customer');
    }
  }

  async function handleSubmit() {
    if (cart.length === 0) {
      setError('Please add at least one book to the cart.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const sale = await api.createSale({
        customer_id: customerId ? Number(customerId) : undefined,
        items: cart.map((item) => ({ book_id: item.book_id, quantity: item.quantity })),
      });
      // Attach items cover images from cart for receipt rendering
      const enrichedSale = {
        ...sale,
        items: (sale.items || []).map((si) => {
          const inCart = cart.find((c) => c.book_id === si.book_id);
          return {
            ...si,
            cover_image: inCart?.cover_image || null,
          };
        }),
      };
      setReceipt(enrichedSale);
      setCart([]);
      setCustomerId('');
    } catch (err) {
      setError(err.message || 'Sale checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  function startNewSale() {
    setReceipt(null);
    setError('');
    loadBooks();
  }

  if (receipt) {
    return (
      <div className="page-container sale-complete-page">
        <div className="sale-success-banner">
          <div className="success-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h2>Sale Completed Successfully!</h2>
            <p>Transaction recorded in sales database. Inventory stock has been deducted.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={startNewSale}>
            Start New Sale
          </button>
        </div>

        <div className="receipt-view-wrapper">
          <Receipt sale={receipt} />
        </div>
      </div>
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="page-container pos-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Point of Sale (POS)</h1>
          <p className="page-subtitle">Select books to add to cart and process sale</p>
        </div>
        {cart.length > 0 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearCart}>
            Clear Cart ({totalItemCount})
          </button>
        )}
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <div className="pos-layout">
        {/* Left: Book Catalog for Selection */}
        <div className="pos-catalog-section">
          {/* Catalog Toolbar */}
          <div className="pos-catalog-toolbar">
            <div className="search-input-wrapper" style={{ flex: 1 }}>
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="Search catalog by title, author, or ISBN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control form-control-sm"
              />
            </div>

            <div className="category-pills-scroll">
              <button
                type="button"
                className={`cat-filter-pill ${selectedCategory === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('ALL')}
              >
                All ({books.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`cat-filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Book Cards Grid with Cover Images */}
          <div className="pos-book-grid">
            {filteredBooks.map((b) => {
              const inCart = cart.find((it) => it.book_id === b.id);
              const isOutOfStock = b.stock_quantity <= 0;
              const remainingStock = b.stock_quantity - (inCart ? inCart.quantity : 0);

              return (
                <div
                  key={b.id}
                  className={`pos-book-card ${isOutOfStock ? 'out-of-stock' : ''} ${inCart ? 'in-cart' : ''}`}
                  onClick={() => !isOutOfStock && remainingStock > 0 && addToCart(b, 1)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!isOutOfStock && remainingStock > 0) addToCart(b, 1);
                    }
                  }}
                  title={isOutOfStock ? 'Out of stock' : `Click to add ${b.title} to cart`}
                >
                  <div className="pos-book-cover">
                    <BookCover src={b.cover_image} title={b.title} size="md" />
                    {inCart && (
                      <div className="pos-cart-badge" title="Quantity in cart">
                        {inCart.quantity} in cart
                      </div>
                    )}
                  </div>
                  <div className="pos-book-info">
                    <div className="pos-book-title" title={b.title}>{b.title}</div>
                    <div className="pos-book-author">{b.author || 'Unknown'}</div>
                    <div className="pos-book-bottom">
                      <span className="pos-book-price">{formatCurrency(b.price)}</span>
                      <StockBadge stock={remainingStock} threshold={b.reorder_threshold} showNumber={true} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm pos-add-btn"
                    disabled={isOutOfStock || remainingStock <= 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(b, 1);
                    }}
                  >
                    {isOutOfStock ? 'Sold Out' : '+ Add'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Cart & Checkout Panel */}
        <div className="pos-cart-section">
          <div className="pos-cart-card card">
            <div className="pos-cart-header">
              <h2>Order Cart</h2>
              <span className="cart-count-pill">{totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}</span>
            </div>

            {/* Cart Items List with Cover Thumbnails */}
            <div className="pos-cart-items">
              {cart.length === 0 ? (
                <div className="cart-empty-state">
                  <div className="cart-empty-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.1" />
                    </svg>
                  </div>
                  <p>Cart is empty</p>
                  <span>Click on books in the catalog to add them here</span>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.book_id} className="cart-item-row">
                    <BookCover src={item.cover_image} title={item.title} size="xs" />
                    <div className="cart-item-details">
                      <div className="cart-item-title" title={item.title}>{item.title}</div>
                      <div className="cart-item-unit-price">{formatCurrency(item.price)} each</div>
                    </div>
                    
                    <div className="cart-qty-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => updateCartQty(item.book_id, -1)}
                        title="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="stepper-value">{item.quantity}</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => updateCartQty(item.book_id, 1)}
                        disabled={item.quantity >= item.stock_quantity}
                        title="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <div className="cart-item-subtotal">
                      {formatCurrency(item.price * item.quantity)}
                    </div>

                    <button
                      type="button"
                      className="cart-item-remove-btn"
                      onClick={() => removeFromCart(item.book_id)}
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Customer Section */}
            <div className="pos-customer-box">
              <label className="pos-section-label">Customer Details</label>
              {!addingCustomer ? (
                <div className="customer-select-row">
                  <select
                    className="form-control form-control-sm"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  >
                    <option value="">Walk-in Customer (No account)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setAddingCustomer(true)}
                    title="Register new customer"
                  >
                    + New
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddCustomer} className="customer-inline-form">
                  <input
                    required
                    placeholder="Full Name *"
                    className="form-control form-control-sm"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                  />
                  <input
                    placeholder="Phone"
                    className="form-control form-control-sm"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="form-control form-control-sm"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                  />
                  <div className="inline-form-actions">
                    <button type="submit" className="btn btn-primary btn-sm">Save</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAddingCustomer(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>

            {/* Cart Summary & Checkout */}
            <div className="pos-checkout-summary">
              <div className="summary-line">
                <span>Subtotal ({totalItemCount} items):</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="summary-line text-emerald">
                <span>Tax (Included):</span>
                <span>Rs. 0.00</span>
              </div>
              <div className="summary-total-line">
                <span>Total Amount:</span>
                <span className="summary-total-value">{formatCurrency(subtotal)}</span>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-lg checkout-btn"
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
              >
                {submitting ? (
                  <>
                    <div className="spinner-sm" /> Processing Sale...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Complete Sale ({formatCurrency(subtotal)})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
