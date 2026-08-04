import React, { useState, useEffect } from 'react';
import { Customer, Agent, Order, Payment } from '../../types';
import { apiClient } from '../../api/client';
import { useApp } from '../../context/AppContext';
import { fmt, orderTotal } from '../../utils/formatters';

const isValidPhone = (phoneStr: string): boolean => {
  if (!phoneStr) return false;
  const cleaned = phoneStr.replace(/[\s\-\(\)]/g, '');
  return /^\+?[0-9]{7,15}$/.test(cleaned);
};

export const Customers: React.FC = () => {
  const { addToast } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  // Customer Detail View state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<(Customer & { orders: Order[]; payments: Payment[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [discountInputs, setDiscountInputs] = useState<Record<string, string>>({});
  const [savingDiscounts, setSavingDiscounts] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Edit Customer Profile Modal state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, aData] = await Promise.all([
        apiClient.customers.getCustomers({ search, area: areaFilter, city: cityFilter }),
        apiClient.agents.getAgents().catch(() => []),
      ]);
      setCustomers(cData);
      setAgents(aData);
    } catch (err) {
      console.error('Error loading customers:', err);
      addToast('Failed to load customers data', 'bad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, areaFilter, cityFilter]);

  const loadCustomerDetail = async (id: string) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    try {
      const data = await apiClient.customers.getCustomerDetail(id);
      setCustomerDetail(data);
      setSelectedAgentId(data.agentId || '');

      const inputs: Record<string, string> = {};
      if (data.seriesDiscounts) {
        data.seriesDiscounts.forEach((sd) => {
          inputs[sd.seriesId] = String(sd.discountPercent);
        });
      }
      setDiscountInputs(inputs);
    } catch (err) {
      console.error('Error loading customer detail:', err);
      addToast('Failed to load customer details', 'bad');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenEditProfile = (cust: Customer) => {
    setEditName(cust.name || '');
    setEditPhone(cust.phone || '');
    setEditArea(cust.area || '');
    setEditCity(cust.city || '');
    setEditAddress(cust.address || '');
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedCustomerId) return;
    if (!editName.trim()) {
      addToast('Customer name is required', 'bad');
      return;
    }
    if (editPhone.trim() && !isValidPhone(editPhone.trim())) {
      addToast('Invalid phone number format. Must contain 7 to 15 digits (e.g. 0300-1234567)', 'bad');
      return;
    }

    setSavingProfile(true);
    try {
      await apiClient.customers.updateCustomer(selectedCustomerId, {
        name: editName.trim(),
        phone: editPhone.trim(),
        area: editArea.trim(),
        city: editCity.trim(),
        address: editAddress.trim(),
      });
      addToast('Customer profile updated', 'good');
      setIsEditProfileOpen(false);
      loadCustomerDetail(selectedCustomerId);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Error updating customer profile', 'bad');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAgentChange = async (customerId: string, newAgentId: string) => {
    try {
      await apiClient.customers.updateCustomer(customerId, { agentId: newAgentId || null });
      addToast('Assigned agent updated', 'good');
      loadData();
      if (customerDetail && customerDetail.id === customerId) {
        setSelectedAgentId(newAgentId);
      }
    } catch (err: any) {
      addToast(err.message || 'Error updating agent', 'bad');
    }
  };

  const handleSaveDiscounts = async () => {
    if (!customerDetail) return;
    setSavingDiscounts(true);
    try {
      const discountsPayload = Object.entries(discountInputs).map(([seriesId, val]) => ({
        seriesId,
        discountPercent: parseFloat(val) || 0,
      }));

      await apiClient.customers.updateDiscounts(customerDetail.id, discountsPayload);
      addToast('Per-series discounts updated successfully', 'good');
      loadCustomerDetail(customerDetail.id);
    } catch (err: any) {
      addToast(err.message || 'Error saving per-series discounts', 'bad');
    } finally {
      setSavingDiscounts(false);
    }
  };

  const areasList = Array.from(new Set(customers.map((c) => c.area).filter(Boolean))).sort();
  const citiesList = Array.from(new Set(customers.map((c) => c.city).filter(Boolean))).sort();
  const hasActiveFilters = search.trim() !== '' || areaFilter !== 'all' || cityFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setAreaFilter('all');
    setCityFilter('all');
  };

  // If in Customer Detail View
  if (selectedCustomerId && (detailLoading || customerDetail)) {
    return (
      <div className="page">
        <div style={{ marginBottom: '16px' }}>
          <button className="btn b-ghost small" onClick={() => setSelectedCustomerId(null)}>
            ← Back to Customers List
          </button>
        </div>

        {detailLoading || !customerDetail ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="ic">⌛</div>
            <b>Loading Customer Profile...</b>
          </div>
        ) : (
          <>
            {/* Customer Header Info */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-dim)', fontWeight: 600 }}>CUSTOMER ACCOUNT</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1 style={{ margin: '4px 0 2px 0', fontSize: '24px', color: 'var(--navy)' }}>{customerDetail.name}</h1>
                    <button className="btn b-ghost small" onClick={() => handleOpenEditProfile(customerDetail)}>
                      ✏️ Edit Profile
                    </button>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ink-dim)', marginTop: '4px' }}>
                    Phone: <b>{customerDetail.phone || '—'}</b> · City: <b>{customerDetail.city || '—'}</b> · Area: <b>{customerDetail.area || '—'}</b> · Address: <b>{customerDetail.address || '—'}</b> · Username: <code>{customerDetail.username}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  {/* Assigned Agent Selector */}
                  <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '8px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--ink-dim)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      ASSIGNED AGENT
                    </label>
                    <select
                      className="cardFilterSelect"
                      style={{ fontSize: '13px', fontWeight: 600, padding: '4px 8px' }}
                      value={selectedAgentId}
                      onChange={(e) => handleAgentChange(customerDetail.id, e.target.value)}
                    >
                      <option value="">No Agent Assigned</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Financial Balance Overview */}
                  <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '8px', textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--ink-dim)', fontWeight: 700 }}>OUTSTANDING BALANCE</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: customerDetail.balance > 0 ? 'var(--bad)' : 'var(--good)', marginTop: '2px' }}>
                      {fmt(customerDetail.balance)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-Series Discounts Card */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="cardHead">
                <div>
                  <h3>Per-Series Discount Rates</h3>
                  <p className="sub" style={{ margin: 0 }}>Set customer-specific discount percentages per series. Orders snapshot these rates when placed.</p>
                </div>
                <button className="btn b-primary small" onClick={handleSaveDiscounts} disabled={savingDiscounts}>
                  {savingDiscounts ? 'Saving...' : 'Save Discounts'}
                </button>
              </div>

              {!customerDetail.seriesDiscounts?.length ? (
                <div className="empty">No product series created yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  {customerDetail.seriesDiscounts.map((sd) => (
                    <div key={sd.seriesId} style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '14px', marginBottom: '6px' }}>{sd.seriesName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          className="cardFilterInput"
                          style={{ width: '80px', padding: '4px 8px', fontSize: '13px', fontWeight: 600 }}
                          value={discountInputs[sd.seriesId] ?? String(sd.discountPercent)}
                          onChange={(e) =>
                            setDiscountInputs({
                              ...discountInputs,
                              [sd.seriesId]: e.target.value,
                            })
                          }
                        />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-dim)' }}>%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Orders & Receivables Log Tabs */}
            <div className="card">
              <div className="cardHead">
                <h3>Order &amp; Payment Activity Log</h3>
              </div>

              <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--line)', marginBottom: '16px', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--navy)', borderBottom: '2px solid var(--blue)', paddingBottom: '6px' }}>
                  Order History ({customerDetail.orders.length})
                </span>
                <span style={{ fontWeight: 700, color: 'var(--ink-dim)', paddingBottom: '6px' }}>
                  Payments Received ({customerDetail.payments.length})
                </span>
              </div>

              {!customerDetail.orders.length ? (
                <div className="empty">No orders placed by this customer yet.</div>
              ) : (
                <div className="tableResponsive">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Items Count</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerDetail.orders.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <b>#{o.id.substring(0, 8)}</b>
                          </td>
                          <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                          <td>{o.items.length} items</td>
                          <td>
                            <span
                              className={`badge ${
                                o.status === 'dispatched'
                                  ? 'b-good'
                                  : o.status === 'approved'
                                  ? 'b-blue'
                                  : o.status === 'denied'
                                  ? 'b-bad'
                                  : 'b-warn'
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }}>
                            {fmt(orderTotal(o, customerDetail).total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Edit Customer Profile Modal */}
            {isEditProfileOpen && (
              <div className="modalOverlay open">
                <div className="modal" style={{ width: '480px', maxWidth: '95vw' }}>
                  <div className="modalHead">
                    <h3>Edit Customer Profile</h3>
                    <button className="drawerClose" onClick={() => setIsEditProfileOpen(false)}>
                      ✕
                    </button>
                  </div>
                  <div className="modalBody">
                    <div className="field">
                      <label>Customer Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Ali Traders"
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Phone Number</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="e.g. 0300-1234567"
                        required
                      />
                    </div>
                    <div className="field">
                      <label>City</label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="e.g. Lahore, Faisalabad, Multan"
                      />
                    </div>
                    <div className="field">
                      <label>Area / Market</label>
                      <input
                        type="text"
                        value={editArea}
                        onChange={(e) => setEditArea(e.target.value)}
                        placeholder="e.g. Gulberg, Brandreth Road"
                      />
                    </div>
                    <div className="field">
                      <label>Full Delivery Address</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="e.g. Shop #12, Main Bazaar"
                      />
                    </div>
                  </div>
                  <div className="modalFoot">
                    <button className="btn b-ghost" onClick={() => setIsEditProfileOpen(false)} disabled={savingProfile}>
                      Cancel
                    </button>
                    <button className="btn b-primary" onClick={handleSaveProfile} disabled={savingProfile}>
                      {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Customers Table View
  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>Customers Directory</h1>
          <p className="sub">Manage customer accounts, assigned sales agents, per-series discounts, and view order history.</p>
        </div>
      </div>

      <div className="card">
        <div className="cardHead">
          <h3>All Customers</h3>
          <div className="cardFilterRow">
            <input
              type="text"
              className="cardFilterInput"
              placeholder="Search name, phone, city, area, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="cardFilterSelect"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            >
              <option value="all">All Cities</option>
              {citiesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="cardFilterSelect"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
            >
              <option value="all">All Areas</option>
              {areasList.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button className="btn b-ghost small" onClick={resetFilters}>
                Reset filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="empty">
            <div className="ic">⌛</div>
            <b>Loading customers...</b>
          </div>
        ) : !customers.length ? (
          <div className="empty">
            <div className="ic">👥</div>
            <b>No customers found</b>
            {hasActiveFilters ? 'Try adjusting your search or city/area filters.' : 'No customer accounts created yet.'}
          </div>
        ) : (
          <div className="tableResponsive">
            <table className="tbl">
              <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>City</th>
                <th>Area / Address</th>
                <th>Assigned Agent</th>
                <th style={{ textAlign: 'right' }}>Balance Owed</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div
                      style={{ fontWeight: 700, color: 'var(--blue)', cursor: 'pointer' }}
                      onClick={() => loadCustomerDetail(c.id)}
                    >
                      {c.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-dim)' }}>@{c.username}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '13px' }}>{c.phone || '—'}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '13px' }}>{c.city || '—'}</span>
                  </td>
                  <td>
                    <span className="badge b-gray">{c.area || '—'}</span>
                    {c.address && (
                      <div style={{ fontSize: '11px', color: 'var(--ink-dim)', marginTop: '2px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.address}
                      </div>
                    )}
                  </td>
                  <td>
                    <select
                      className="cardFilterSelect"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      value={c.agentId || ''}
                      onChange={(e) => handleAgentChange(c.id, e.target.value)}
                    >
                      <option value="">No Agent</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: c.balance > 0 ? 'var(--bad)' : 'var(--good)' }}>
                    {fmt(c.balance)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn b-ghost small" onClick={() => loadCustomerDetail(c.id)}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
};
