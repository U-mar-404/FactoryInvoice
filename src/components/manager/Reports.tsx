import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, orderTotal } from '../../utils/formatters';
import { StockItem } from '../../types';
import { apiClient } from '../../api/client';

export const Reports: React.FC = () => {
  const { orders, customers, payments, custById } = useApp();
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [loadingLowStock, setLoadingLowStock] = useState(true);

  useEffect(() => {
    apiClient.stock.getLowStock()
      .then((res) => setLowStockItems(res || []))
      .catch(() => setLowStockItems([]))
      .finally(() => setLoadingLowStock(false));
  }, []);

  const areaOptions = Array.from(new Set(customers.map((c) => c.area))).filter(Boolean).sort();
  const monthOptions = Array.from(
    new Set(
      orders
        .filter((o) => o.status === 'dispatched')
        .map((o) => {
          const d = new Date(o.createdAt);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          return `${y}-${m}`;
        })
    )
  ).sort().reverse();

  const dispatched = orders.filter((o) => {
    if (o.status !== 'dispatched') return false;

    const c = custById(o.customerId);
    const area = c ? c.area : 'Unspecified';

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = o.customerName.toLowerCase().includes(q);
      const matchArea = area.toLowerCase().includes(q);
      if (!matchName && !matchArea) return false;
    }

    if (areaFilter !== 'all' && area.toLowerCase() !== areaFilter.toLowerCase()) {
      return false;
    }

    if (monthFilter !== 'all') {
      const d = new Date(o.createdAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const ordMonth = `${y}-${m}`;
      if (ordMonth !== monthFilter) return false;
    }

    return true;
  });

  const totalSales = dispatched.reduce((s, o) => s + orderTotal(o, custById).total, 0);

  const byCust: Record<string, number> = {};
  dispatched.forEach((o) => {
    byCust[o.customerName] = (byCust[o.customerName] || 0) + orderTotal(o, custById).total;
  });

  const byArea: Record<string, number> = {};
  dispatched.forEach((o) => {
    const c = custById(o.customerId);
    const a = c ? c.area : '—';
    byArea[a] = (byArea[a] || 0) + orderTotal(o, custById).total;
  });

  const totalOwed = customers.reduce((s, c) => s + c.balance, 0);

  const hasActiveFilters = search !== '' || areaFilter !== 'all' || monthFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setAreaFilter('all');
    setMonthFilter('all');
  };

  // Group low stock items by series
  const lowStockBySeries: Record<string, StockItem[]> = {};
  lowStockItems.forEach((item) => {
    const sName = item.seriesName || 'Standard';
    if (!lowStockBySeries[sName]) lowStockBySeries[sName] = [];
    lowStockBySeries[sName].push(item);
  });

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>Reports &amp; Inventory Alerts</h1>
          <p className="sub">Sales, stock movement, low stock alerts, and receivables at a glance.</p>
        </div>
        <div className="cardFilterRow">
          <input
            type="text"
            className="cardFilterInput"
            placeholder="Search customer, area..."
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

      <div className="statRow">
        <div className="statCard">
          <div className="lbl">Total sales (dispatched)</div>
          <div className="val">{fmt(totalSales)}</div>
        </div>
        <div className="statCard">
          <div className="lbl">Orders dispatched</div>
          <div className="val">{dispatched.length}</div>
        </div>
        <div className="statCard">
          <div className="lbl">Outstanding receivables</div>
          <div className="val">{fmt(totalOwed)}</div>
        </div>
        <div className="statCard">
          <div className="lbl">Low Stock Alerts</div>
          <div className="val" style={{ color: lowStockItems.length > 0 ? 'var(--bad)' : 'var(--navy)' }}>
            {lowStockItems.length}
          </div>
        </div>
      </div>

      {/* Low Stock Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="cardHead">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> Low Stock Inventory Alerts ({lowStockItems.length})
          </h3>
        </div>

        {loadingLowStock ? (
          <div className="empty">Loading inventory alert status...</div>
        ) : !lowStockItems.length ? (
          <div className="empty" style={{ color: 'var(--good)' }}>
            <div className="ic">✅</div>
            <b>All inventory levels are optimal</b>No SKUs are at or below minimum stock thresholds.
          </div>
        ) : (
          <div style={{ padding: '0 16px 16px 16px' }}>
            {Object.entries(lowStockBySeries).map(([sName, items]) => (
              <div key={sName} style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '8px 0', color: 'var(--navy)', fontSize: '14px' }}>{sName} Series</h4>
                <div className="tableResponsive">
                  <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px' }}>#</th>
                        <th style={{ padding: '6px 10px' }}>Item Code &amp; Name</th>
                        <th style={{ padding: '6px 10px' }}>Color</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>Current Stock</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>Minimum Threshold</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center' }}>Alert Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--line)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--ink-dim)' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.name} (CODE {item.code})</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span className="badge b-blue">{item.colorName}</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--bad)' }}>
                            {item.stockQty} box(es)
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                            {item.minStockLevel} box(es)
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span className="badge b-bad">AT / BELOW MINIMUM</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
        <div className="card">
          <div className="cardHead">
            <h3>Sales by customer</h3>
          </div>
          <div className="tableResponsive">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(byCust).length ? (
                  Object.entries(byCust).map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{fmt(v)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>
                      <div className="empty">
                        {hasActiveFilters ? 'No sales matching current filters.' : 'No dispatched sales yet.'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="cardHead">
            <h3>Sales by area</h3>
          </div>
          <div className="tableResponsive">
            <table>
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(byArea).length ? (
                  Object.entries(byArea).map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{fmt(v)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>
                      <div className="empty">
                        {hasActiveFilters ? 'No sales matching current filters.' : 'No dispatched sales yet.'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
