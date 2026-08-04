import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, StockItem } from '../../types';
import { fmt, orderTotal } from '../../utils/formatters';
import { printOrderInvoice, printPackingSlip } from '../../utils/printInvoice';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../api/client';

interface OrdersTableProps {
  orders: Order[];
  viewer: 'customer' | 'manager' | 'store';
  onModify?: (orderId: string) => void;
  onRowClick?: (order: Order) => void;
  title?: string;
}

const renderStatusBadge = (s: OrderStatus) => {
  if (s === 'pending') {
    return <span className="badge b-warn">Waiting for approval</span>;
  }
  return (
    <span className={`badge ${s}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
};

export const OrdersTable: React.FC<OrdersTableProps> = ({ orders, viewer, onModify, onRowClick, title = 'Orders' }) => {
  const { setOrderStatus, dispatchOrder, custById } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Stock items map for Manager view: key = "code-series-color" or "skuId"
  const [stockList, setStockList] = useState<StockItem[]>([]);

  useEffect(() => {
    if (viewer === 'manager') {
      apiClient.stock.getStock()
        .then((res) => setStockList(res || []))
        .catch(() => setStockList([]));
    }
  }, [viewer, expandedOrderId]);

  // Quick lookup helper for SKU stock by code, series, color
  const getSkuStock = (code: string, seriesName: string, colorName?: string): StockItem | undefined => {
    const cName = (colorName || 'Standard').toLowerCase();
    const sName = seriesName.toLowerCase();
    const cCode = code.toLowerCase();

    return stockList.find(
      (s) =>
        s.code.toLowerCase() === cCode &&
        s.seriesName.toLowerCase() === sName &&
        s.colorName.toLowerCase() === cName
    );
  };

  // Derive unique months from orders
  const monthOptions = Array.from(
    new Set(
      orders.map((o) => {
        const d = new Date(o.createdAt);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      })
    )
  ).sort().reverse();

  // Combine filters
  const filteredOrders = orders.filter((o) => {
    // 1. Search text (ID, Customer Name, Items)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchCust = o.customerName.toLowerCase().includes(q);
      const matchItem = o.items.some((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
      if (!matchId && !matchCust && !matchItem) return false;
    }

    // 2. Status filter
    if (statusFilter !== 'all' && o.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }

    // 3. Month filter
    if (monthFilter !== 'all') {
      const d = new Date(o.createdAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const orderMonth = `${y}-${m}`;
      if (orderMonth !== monthFilter) return false;
    }

    return true;
  });

  const hasActiveFilters = search !== '' || statusFilter !== 'all' || monthFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setMonthFilter('all');
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const renderStatusBadge = (st: OrderStatus) => {
    switch (st) {
      case 'pending':
        return <span className="badge b-warn">Waiting for approval</span>;
      case 'approved':
        return <span className="badge b-blue">Approved</span>;
      case 'dispatched':
        return <span className="badge b-good">Dispatched</span>;
      case 'denied':
        return <span className="badge b-bad">Denied</span>;
      default:
        return <span className="badge">{st}</span>;
    }
  };

  return (
    <div>
      <div className="cardHead">
        <h3>{title}</h3>
        <div className="cardFilterRow">
          <input
            type="text"
            className="cardFilterInput"
            placeholder="Search ID, customer, item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {viewer !== 'store' && (
            <select
              className="cardFilterSelect"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Waiting for approval</option>
              <option value="approved">Approved</option>
              <option value="dispatched">Dispatched</option>
              <option value="denied">Denied</option>
            </select>
          )}

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

      {!filteredOrders.length ? (
        <div className="empty">
          <div className="ic">📦</div>
          <b>No orders found</b>
          {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Nothing to show yet.'}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="desktopTable tableResponsive">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  {viewer !== 'store' && <th>Total Amount</th>}
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const t = orderTotal(o, custById);
                  const totalBoxes = o.items.reduce((s, i) => s + i.qty, 0);
                  const isExpanded = expandedOrderId === o.id;

                  let hasShortage = false;
                  if (viewer === 'manager' && o.status === 'pending') {
                    hasShortage = o.items.some((i) => {
                      const sku = getSkuStock(i.code, i.series, i.color);
                      return sku ? i.qty > sku.stockQty : false;
                    });
                  }

                  const seriesGroups: Record<string, typeof o.items> = {};
                  o.items.forEach((item) => {
                    const sName = item.series || 'Standard';
                    if (!seriesGroups[sName]) seriesGroups[sName] = [];
                    seriesGroups[sName].push(item);
                  });

                  return (
                    <React.Fragment key={o.id}>
                      <tr className="rowIn" style={{ background: isExpanded ? 'var(--bg-subtle)' : 'transparent' }}>
                        <td>
                          <b style={{ color: 'var(--navy)', cursor: 'pointer' }} onClick={() => toggleExpand(o.id)}>
                            {o.id.slice(-6).toUpperCase()}
                          </b>
                          <br />
                          <span style={{ color: 'var(--ink-dim)', fontSize: '11.5px' }}>
                            {new Date(o.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td>{o.customerName}</td>
                        <td>
                          <span
                            style={{ cursor: 'pointer', color: 'var(--blue)', fontWeight: 600 }}
                            onClick={() => toggleExpand(o.id)}
                          >
                            {o.items.length} item{o.items.length > 1 ? 's' : ''} · {totalBoxes} box {isExpanded ? '▲' : '▼'}
                          </span>
                        </td>
                        {viewer !== 'store' && <td style={{ fontWeight: 700 }}>{fmt(t.total)}</td>}
                        <td>{renderStatusBadge(o.status)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="btnRow" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn b-ghost small" onClick={() => toggleExpand(o.id)}>
                              {isExpanded ? 'Hide Details' : 'View Breakdown'}
                            </button>
                            {viewer === 'manager' && (
                              <>
                                {o.status === 'pending' && (
                                  <button
                                    className="btn b-primary small"
                                    onClick={() => (onRowClick ? onRowClick(o) : onModify && onModify(o.id))}
                                  >
                                    Review Order
                                  </button>
                                )}
                                {o.status === 'approved' && (
                                  <button
                                    className="btn b-ghost small"
                                    onClick={() => onModify && onModify(o.id)}
                                  >
                                    Modify
                                  </button>
                                )}
                                {o.status === 'dispatched' && (
                                  <button
                                    className="btn b-ghost small"
                                    onClick={() => printOrderInvoice(o)}
                                  >
                                    Print invoice
                                  </button>
                                )}
                              </>
                            )}
                            {viewer === 'store' && (
                              <>
                                <button
                                  className="btn b-ghost small"
                                  onClick={() => printPackingSlip(o)}
                                >
                                  Print packing slip
                                </button>
                                {o.status === 'approved' && (
                                  <button
                                    className="btn b-good small"
                                    onClick={() => dispatchOrder(o.id)}
                                  >
                                    Mark dispatched
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={viewer === 'store' ? 5 : 6} style={{ padding: '0 0 16px 0', background: 'var(--bg-subtle)' }}>
                            <div style={{ padding: '16px 20px', background: '#fff', margin: '0 12px 12px 12px', borderRadius: '8px', border: '1.5px solid var(--line)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--navy)' }}>
                                  {viewer === 'store'
                                    ? `Order Fulfillment & Packing Details (Order #${o.id.slice(-6).toUpperCase()})`
                                    : `Series-Grouped Order Review (Order #${o.id.slice(-6).toUpperCase()})`}
                                </div>
                                {viewer === 'manager' && hasShortage && (
                                  <span className="badge b-bad" style={{ fontSize: '12px' }}>
                                    ⚠️ Insufficient Stock Alert
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: '12px', color: 'var(--ink-dim)', marginBottom: '12px', padding: '6px 10px', background: '#F8FAFC', borderRadius: '6px', border: '1px solid var(--line)' }}>
                                Customer: <b style={{ color: 'var(--navy)' }}>{o.customerName}</b>
                                {o.customerPhone && <> · Phone: <b style={{ color: 'var(--navy)' }}>{o.customerPhone}</b></>}
                                {o.customerCity && <> · City: <b style={{ color: 'var(--navy)' }}>{o.customerCity}</b></>}
                                {o.customerArea && <> · Area: <b style={{ color: 'var(--navy)' }}>{o.customerArea}</b></>}
                                {o.customerAddress && <> · Address: <b style={{ color: 'var(--navy)' }}>{o.customerAddress}</b></>}
                              </div>

                              {viewer === 'manager' && hasShortage && (
                                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600, marginBottom: '14px' }}>
                                  ⚠️ <b>Approval Blocked:</b> One or more requested item quantities exceed current on-hand stock. Modify order quantities down to available stock or add stock before approving.
                                </div>
                              )}

                              {Object.entries(seriesGroups).map(([sName, items]) => {
                                const seriesDiscount = o.items.find((i) => (i.series || 'Standard') === sName)?.discountPercent || 0;
                                return (
                                  <div key={sName} style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--blue)', fontSize: '13px', textTransform: 'uppercase' }}>
                                        {sName} Series
                                      </span>
                                      {viewer !== 'store' && (
                                        <span className="badge b-blue" style={{ fontSize: '11px' }}>
                                          Series Discount: {seriesDiscount}%
                                        </span>
                                      )}
                                    </div>
                                    <table className="tbl" style={{ fontSize: '12.5px' }}>
                                      <thead>
                                        <tr>
                                          <th>Code</th>
                                          <th>Item Name</th>
                                          <th>Color</th>
                                          <th style={{ textAlign: 'right' }}>Qty (Boxes)</th>
                                          {viewer !== 'store' && <th style={{ textAlign: 'right' }}>Base Rate</th>}
                                          {viewer !== 'store' && <th style={{ textAlign: 'right' }}>Disc. Price</th>}
                                          {viewer !== 'store' && <th style={{ textAlign: 'right' }}>Line Total</th>}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {items.map((it) => {
                                          const base = it.price;
                                          const discPrice = Math.round(base * (1 - seriesDiscount / 100));
                                          const lineTotal = discPrice * it.qty;
                                          const sku = getSkuStock(it.code, it.series, it.color);
                                          const isShort = viewer === 'manager' && o.status === 'pending' && sku && it.qty > sku.stockQty;

                                          return (
                                            <tr key={`${it.code}-${it.color}`} style={{ background: isShort ? '#FEF2F2' : 'transparent' }}>
                                              <td><b>{it.code}</b></td>
                                              <td>{it.name}</td>
                                              <td><span className="badge b-blue">{it.color}</span></td>
                                              <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                {it.qty}
                                                {isShort && (
                                                  <div style={{ fontSize: '10.5px', color: 'var(--bad)', fontWeight: 700 }}>
                                                    (Avail: {sku?.stockQty ?? 0})
                                                  </div>
                                                )}
                                              </td>
                                              {viewer !== 'store' && <td style={{ textAlign: 'right', color: 'var(--ink-dim)' }}>{fmt(base)}</td>}
                                              {viewer !== 'store' && <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(discPrice)}</td>}
                                              {viewer !== 'store' && <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }}>{fmt(lineTotal)}</td>}
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Orders Card List View */}
          <div className="mCardList">
            {filteredOrders.map((o) => {
              const t = orderTotal(o, custById);
              const totalBoxes = o.items.reduce((s, i) => s + i.qty, 0);
              const isExpanded = expandedOrderId === o.id;

              const seriesGroups: Record<string, typeof o.items> = {};
              o.items.forEach((item) => {
                const sName = item.series || 'Standard';
                if (!seriesGroups[sName]) seriesGroups[sName] = [];
                seriesGroups[sName].push(item);
              });

              return (
                <div key={o.id} className="mCard">
                  {/* Top Row: Order ID + Status Badge */}
                  <div className="mCardHeader">
                    <b style={{ color: 'var(--navy)', fontSize: '13.5px', letterSpacing: '0.3px' }}>
                      #{o.id.slice(-6).toUpperCase()}
                    </b>
                    {renderStatusBadge(o.status)}
                  </div>

                  {/* Customer Name & Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--navy)' }}>
                      {o.customerName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-dim)' }}>
                      {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Item Summary Tappable Pill */}
                  <div>
                    <button
                      type="button"
                      className="btn b-ghost small"
                      style={{
                        width: '100%',
                        justifyContent: 'space-between',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--line)',
                        padding: '6px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--blue)',
                      }}
                      onClick={() => toggleExpand(o.id)}
                    >
                      <span>📦 {o.items.length} item{o.items.length > 1 ? 's' : ''} · {totalBoxes} box</span>
                      <span>{isExpanded ? '▲ Hide' : '▼ Breakdown'}</span>
                    </button>
                  </div>

                  {/* Expanded Breakdown inside Mobile Card */}
                  {isExpanded && (
                    <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12.5px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '8px' }}>
                        Order Details (#{o.id.slice(-6).toUpperCase()})
                      </div>
                      {Object.entries(seriesGroups).map(([sName, sItems]) => (
                        <div key={sName} style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            {sName} Series
                          </div>
                          {sItems.map((item, idx) => (
                            <div key={item.code ? `${item.code}-${item.color}` : idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dashed var(--line)' }}>
                              <span>{item.name} ({item.color}) × {item.qty} box</span>
                              {viewer !== 'store' && <b>{fmt(item.price * item.qty)}</b>}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mCardDivider"></div>

                  {/* Bottom Row: Total Amount + Action Buttons */}
                  <div className="mCardFooter">
                    {viewer !== 'store' ? (
                      <div className="mCardTotal">{fmt(t.total)}</div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--ink-dim)', fontWeight: 600 }}>Packing Desk</div>
                    )}

                    <div className="btnRow" style={{ gap: '6px', width: 'auto' }}>
                      {viewer === 'manager' && (
                        <>
                          {o.status === 'pending' && (
                            <button
                              className="btn b-primary small"
                              onClick={() => (onRowClick ? onRowClick(o) : onModify && onModify(o.id))}
                            >
                              Review
                            </button>
                          )}
                          {o.status === 'approved' && (
                            <button className="btn b-ghost small" onClick={() => onModify && onModify(o.id)}>
                              Modify
                            </button>
                          )}
                          {o.status === 'dispatched' && (
                            <button className="btn b-ghost small" onClick={() => printOrderInvoice(o)}>
                              Invoice
                            </button>
                          )}
                        </>
                      )}
                      {viewer === 'store' && (
                        <>
                          <button className="btn b-ghost small" onClick={() => printPackingSlip(o)}>
                            Slip
                          </button>
                          {o.status === 'approved' && (
                            <button className="btn b-good small" onClick={() => dispatchOrder(o.id)}>
                              Dispatch
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
