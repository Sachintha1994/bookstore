import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadCustomers() {
    setLoading(true);
    setError('');
    try {
      setCustomers(await api.getCustomers());
    } catch (err) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.getCustomers()
      .then((data) => {
        if (active) {
          setCustomers(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load customers');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setFormError('');
    try {
      await api.createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      setForm({ name: '', phone: '', email: '' });
      await loadCustomers();
    } catch (err) {
      setFormError(err.message || 'Error creating customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Directory</h1>
          <p className="page-subtitle">Manage customer profiles and contact details</p>
        </div>
        <span className="user-tag">{customers.length} registered customers</span>
      </div>

      <section className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-section-title">Add New Customer</h2>
        {formError && <div className="error-banner" role="alert">{formError}</div>}
        <form className="customer-grid-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="cust-name">Full Name <span className="required">*</span></label>
            <input
              id="cust-name"
              required
              className="form-control"
              placeholder="e.g. Kasun Jayawardena"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="cust-phone">Phone Number</label>
            <input
              id="cust-phone"
              className="form-control"
              placeholder="e.g. +94 77 123 4567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="cust-email">Email Address</label>
            <input
              id="cust-email"
              type="email"
              className="form-control"
              placeholder="e.g. kasun@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 42 }} disabled={saving}>
              {saving ? 'Adding...' : '+ Add Customer'}
            </button>
          </div>
        </form>
      </section>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading customers...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="card empty-state">
          <h3>No customers registered yet</h3>
          <p>Use the form above to register your first customer.</p>
        </div>
      ) : (
        <div className="table-responsive card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Email Address</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="customer-avatar">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  </td>
                  <td>
                    <div className="cell-title">{c.name}</div>
                    <div className="cell-sub">Customer #{c.id}</div>
                  </td>
                  <td>{c.phone || <span className="text-muted">—</span>}</td>
                  <td>{c.email || <span className="text-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
