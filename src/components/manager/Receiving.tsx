import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt } from '../../utils/formatters';
import { Payment } from '../../types';

export const Receiving: React.FC = () => {
  const { customers, payments, logPayment, updatePayment, custById } = useApp();

  // Log Payment Modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState(customers[0]?.id || '');
  const [custSearch, setCustSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Edit Payment Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Table Filters
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  const areaOptions = Array.from(new Set(customers.map((c) => c.area))).filter(Boolean).sort();
  const monthOptions = Array.from(
    new Set(
      payments.map((p) => {
        const d = new Date(p.date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      })
    )
  ).sort().reverse();

  const filteredPayments = payments.filter((p) => {
    const cust = custById(p.customerId);
    const custName = cust ? cust.name : '';
    const custArea = cust ? cust.area : '';

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = custName.toLowerCase().includes(q);
      const matchNote = (p.note || '').toLowerCase().includes(q);
      if (!matchName && !matchNote) return false;
    }

    if (areaFilter !== 'all' && custArea.toLowerCase() !== areaFilter.toLowerCase()) {
      return false;
    }

    if (monthFilter !== 'all') {
      const d = new Date(p.date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const payMonth = `${y}-${m}`;
      if (payMonth !== monthFilter) return false;
    }

    return true;
  });

  const hasActiveFilters = search !== '' || areaFilter !== 'all' || monthFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setAreaFilter('all');
    setMonthFilter('all');
  };

  const handleOpenLogModal = () => {
    if (customers.length) {
      setSelectedCustId(customers[0].id);
    }
    setCustSearch('');
    setAmount('');
    setNote('');
    setIsLogModalOpen(true);
  };

  const handleSavePayment = async () => {
    const amt = parseFloat(amount || '0');
    if (amt <= 0) return;

    await logPayment(selectedCustId, amt, note);
    setIsLogModalOpen(false);
  };

  const handleOpenEditModal = (payment: Payment) => {
    setEditingPayment(payment);
    setEditAmount(String(payment.amount));
    setEditNote(payment.note === '—' ? '' : payment.note || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEditPayment = async () => {
    if (!editingPayment) return;
    const amt = parseFloat(editAmount || '0');
    if (amt <= 0) return;

    setSavingEdit(true);
    try {
      await updatePayment(editingPayment.id, amt, editNote);
      setIsEditModalOpen(false);
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter customer options in log modal
  const filteredCustomerOptions = customers.filter((c) => {
    if (!custSearch.trim()) return true;
    const q = custSearch.trim().toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.area || '').toLowerCase().includes(q);
  });

  const selectedCust = customers.find((c) => c.id === selectedCustId);

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>Receiving</h1>
          <p className="sub">Log customer payments against their outstanding balance.</p>
        </div>
        <div className="btnRow">
          <button className="btn b-primary" onClick={handleOpenLogModal}>
            + Log payment
          </button>
        </div>
      </div>

      <div className="card">
        <div className="cardHead">
          <h3>Payment History (Accounts Receivable)</h3>
          <div className="cardFilterRow">
            <input
              type="text"
              className="cardFilterInput"
              placeholder="Search customer, note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="cardFilterSelect"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
            >
              <option value="all">All Areas</option>
              {areaOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              className="cardFilterSelect"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="all">All Months</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
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

        {!filteredPayments.length ? (
          <div className="empty">
            <div className="ic">🪙</div>
            <b>No payments logged</b>
            {hasActiveFilters ? 'Try adjusting your search or filters.' : 'No payments logged yet.'}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktopTable tableResponsive">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Note</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="rowIn">
                      <td>{new Date(p.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{custById(p.customerId)?.name || '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmt(p.amount)}</td>
                      <td>{p.note || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn b-ghost small" onClick={() => handleOpenEditModal(p)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Receiving Payments Cards */}
            <div className="mCardList">
              {filteredPayments.map((p) => (
                <div key={p.id} className="mCard">
                  <div className="mCardHeader">
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy)' }}>
                      {custById(p.customerId)?.name || 'Unknown Customer'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-dim)' }}>
                      {new Date(p.date).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: '16.5px', fontWeight: 800, color: 'var(--navy)' }}>
                      {fmt(p.amount)}
                    </div>
                    {p.note && (
                      <div style={{ fontSize: '12px', color: 'var(--ink-dim)', fontStyle: 'italic' }}>
                        "{p.note}"
                      </div>
                    )}
                  </div>

                  <div className="mCardDivider"></div>

                  <div className="mCardFooter">
                    <span style={{ fontSize: '12px', color: 'var(--ink-dim)' }}>Logged Payment</span>
                    <button className="btn b-ghost small" onClick={() => handleOpenEditModal(p)}>
                      Edit Payment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Log Payment Received Modal */}
      <div className={`modalOverlay ${isLogModalOpen ? 'open' : ''}`}>
        <div className="modal" style={{ width: '560px', maxWidth: '95vw' }}>
          <div className="modalHead">
            <h3>Log payment received</h3>
            <button className="drawerClose" onClick={() => setIsLogModalOpen(false)}>
              ✕
            </button>
          </div>
          <div className="modalBody">
            <div className="field">
              <label>Select Customer</label>
              <input
                type="text"
                className="cardFilterInput"
                style={{ width: '100%', marginBottom: '8px' }}
                placeholder="Type customer name or area to filter..."
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
              />

              {selectedCust && (
                <div
                  style={{
                    background: '#F0F7FF',
                    border: '1px solid var(--blue)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    fontSize: '13px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    Selected: <b>{selectedCust.name}</b> ({selectedCust.area || 'Unspecified'})
                  </div>
                  <span className="badge b-warn" style={{ fontSize: '11.5px' }}>
                    Owes {fmt(selectedCust.balance)}
                  </span>
                </div>
              )}

              <div
                style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  border: '1.5px solid var(--line)',
                  borderRadius: '8px',
                  background: '#fff',
                }}
              >
                {!filteredCustomerOptions.length ? (
                  <div style={{ padding: '12px', color: 'var(--ink-dim)', textAlign: 'center', fontSize: '13px' }}>
                    No matching customer found
                  </div>
                ) : (
                  filteredCustomerOptions.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCustId(c.id)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--line)',
                        cursor: 'pointer',
                        background: selectedCustId === c.id ? '#EFF6FF' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '13.5px' }}>{c.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-dim)' }}>
                          Area: {c.area || 'Unspecified'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge b-warn" style={{ fontSize: '11.5px' }}>
                          Owes {fmt(c.balance)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="field">
              <label>Amount received</label>
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Note (optional)</label>
              <input
                placeholder="e.g. Bank transfer, Cheque #1234"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <div className="modalFoot">
            <button className="btn b-ghost" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </button>
            <button className="btn b-primary" onClick={handleSavePayment}>
              Log payment
            </button>
          </div>
        </div>
      </div>

      {/* Edit Payment Modal */}
      <div className={`modalOverlay ${isEditModalOpen ? 'open' : ''}`}>
        <div className="modal" style={{ width: '500px', maxWidth: '95vw' }}>
          <div className="modalHead">
            <h3>Edit Payment Entry</h3>
            <button className="drawerClose" onClick={() => setIsEditModalOpen(false)} disabled={savingEdit}>
              ✕
            </button>
          </div>
          <div className="modalBody">
            {editingPayment && (
              <>
                <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--ink-dim)' }}>Customer</div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '14px' }}>
                    {custById(editingPayment.customerId)?.name || '—'}
                  </div>
                </div>

                <div className="field">
                  <label>Payment Amount</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Note (optional)</label>
                  <input
                    placeholder="e.g. Adjusted bank deposit"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <div className="modalFoot">
            <button className="btn b-ghost" onClick={() => setIsEditModalOpen(false)} disabled={savingEdit}>
              Cancel
            </button>
            <button className="btn b-primary" onClick={handleSaveEditPayment} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
