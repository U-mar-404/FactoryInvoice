import React, { useState, useEffect } from 'react';
import { Order, StockItem } from '../../types';
import { fmt } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../api/client';

interface ManagerOrderReviewModalProps {
  order: Order;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const ManagerOrderReviewModal: React.FC<ManagerOrderReviewModalProps> = ({
  order,
  onClose,
  onSaveSuccess,
}) => {
  const { addToast, custById } = useApp();

  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states: item quantity by item index, series discount by series name
  const [qtyInputs, setQtyInputs] = useState<Record<number, string>>({});
  const [seriesDiscounts, setSeriesDiscounts] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch current stock list
    apiClient.stock
      .getStock()
      .then((res) => setStockList(res || []))
      .catch(() => setStockList([]))
      .finally(() => setLoadingStock(false));

    // Initialize item quantity inputs
    const initialQtyMap: Record<number, string> = {};
    order.items.forEach((item, idx) => {
      initialQtyMap[idx] = String(item.qty);
    });
    setQtyInputs(initialQtyMap);

    // Initialize series discounts inputs
    const initialDiscMap: Record<string, string> = {};
    const cust = custById(order.customerId || order.customerName);

    order.items.forEach((item) => {
      const sName = item.series || 'Standard';
      if (initialDiscMap[sName] === undefined) {
        let disc = item.discountPercent;
        if ((disc === undefined || disc === null || disc === 0) && cust && cust.seriesDiscounts) {
          const sd = cust.seriesDiscounts.find(
            (d) => d.seriesName.toLowerCase() === sName.toLowerCase()
          );
          if (sd && sd.discountPercent > 0) disc = sd.discountPercent;
        }
        initialDiscMap[sName] = String(disc ?? (order.discount || 0));
      }
    });
    setSeriesDiscounts(initialDiscMap);
  }, [order]);

  // Quick lookup for SKU stock by item code, series, color
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

  // Group line items by Series
  const seriesGroups: Record<string, { item: typeof order.items[0]; originalIndex: number }[]> = {};
  order.items.forEach((item, idx) => {
    const sName = item.series || 'Standard';
    if (!seriesGroups[sName]) seriesGroups[sName] = [];
    seriesGroups[sName].push({ item, originalIndex: idx });
  });

  // Calculate live grand total & stock availability
  let grandTotal = 0;
  let hasShortage = false;

  Object.entries(seriesGroups).forEach(([sName, groupItems]) => {
    const discPct = parseFloat(seriesDiscounts[sName] || '0') || 0;

    groupItems.forEach(({ item, originalIndex }) => {
      const currentQty = parseInt(qtyInputs[originalIndex] || '0', 10);
      const safeQty = isNaN(currentQty) || currentQty < 0 ? 0 : currentQty;

      const priceAfterDisc = Math.round(item.price * (1 - discPct / 100));
      const lineTotal = priceAfterDisc * safeQty;
      grandTotal += lineTotal;

      const sku = getSkuStock(item.code, item.series, item.color);
      if (sku && safeQty > sku.stockQty) {
        hasShortage = true;
      }
    });
  });

  const handleSaveOrApprove = async (approve: boolean) => {
    if (approve && hasShortage) {
      addToast('Cannot approve order: requested quantities exceed available stock', 'bad');
      return;
    }

    setSubmitting(true);
    try {
      // Build qty map and series discount map
      const qtyMap: Record<number, number> = {};
      order.items.forEach((_, idx) => {
        const parsed = parseInt(qtyInputs[idx], 10);
        qtyMap[idx] = isNaN(parsed) ? 0 : parsed;
      });

      const discMapParsed: Record<string, number> = {};
      Object.entries(seriesDiscounts).forEach(([sName, val]) => {
        const parsed = parseInt(val, 10);
        discMapParsed[sName] = isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
      });

      await apiClient.orders.modifyItems(order.id, qtyMap, discMapParsed, approve);
      addToast(
        approve ? `Order #${order.id.slice(-6).toUpperCase()} approved successfully!` : `Order edits saved successfully!`,
        'good'
      );
      onSaveSuccess();
      onClose();
    } catch (e: any) {
      addToast(e.message || 'Error updating order', 'bad');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeny = async () => {
    setSubmitting(true);
    try {
      await apiClient.orders.setStatus(order.id, 'denied');
      addToast(`Order #${order.id.slice(-6).toUpperCase()} denied`, 'good');
      onSaveSuccess();
      onClose();
    } catch (e: any) {
      addToast(e.message || 'Error denying order', 'bad');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay open">
      <div className="modal" style={{ width: '800px', maxWidth: '95vw' }}>
        <div className="modalHead">
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--navy)' }}>
              Review Order #{order.id.slice(-6).toUpperCase()}
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--ink-dim)' }}>
              Customer: <b>{order.customerName}</b> · Placed: {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </div>
          <button className="drawerClose" onClick={onClose} disabled={submitting}>
            ✕
          </button>
        </div>

        <div className="modalBody" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px' }}>
          {loadingStock ? (
            <div className="empty">
              <div className="spinner" style={{ margin: '16px auto' }}></div>
              Loading stock availability...
            </div>
          ) : (
            <>
              {hasShortage && (
                <div
                  style={{
                    background: '#FEE2E2',
                    color: '#991B1B',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '16px',
                    border: '1px solid #FCA5A5',
                  }}
                >
                  ⚠️ <b>Approval Blocked:</b> One or more item quantities exceed current on-hand stock. Reduce requested quantities down to available stock or add stock before approving.
                </div>
              )}

              {Object.entries(seriesGroups).map(([sName, groupItems]) => {
                const currentDiscVal = seriesDiscounts[sName] !== undefined ? seriesDiscounts[sName] : '0';
                const discPct = parseFloat(currentDiscVal) || 0;

                return (
                  <div key={sName} className="card" style={{ marginBottom: '20px', padding: '16px' }}>
                    {/* Series Header with Editable Discount % */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#F8FAFC',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <h4 style={{ margin: 0, color: 'var(--navy)', fontSize: '15px' }}>
                        {sName} Series
                      </h4>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink-dim)' }}>Series Discount %:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="fInput"
                          style={{ width: '75px', textAlign: 'center', fontWeight: 700 }}
                          value={currentDiscVal}
                          onChange={(e) =>
                            setSeriesDiscounts((prev) => ({
                              ...prev,
                              [sName]: e.target.value,
                            }))
                          }
                        />
                        <span style={{ fontWeight: 700, color: 'var(--navy)' }}>%</span>
                      </div>
                    </div>

                    {/* Series Line Items Table */}
                    <table className="tbl" style={{ width: '100%', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: '#FAFBFD', textAlign: 'left' }}>
                          <th style={{ width: '32px' }}>#</th>
                          <th>Item Code &amp; Name</th>
                          <th>Color</th>
                          <th style={{ textAlign: 'center' }}>On-Hand Stock</th>
                          <th style={{ textAlign: 'right', width: '150px' }}>Quantity Requested</th>
                          <th style={{ textAlign: 'right' }}>Price</th>
                          <th style={{ textAlign: 'right' }}>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupItems.map(({ item, originalIndex }, idx) => {
                          const currentQtyVal = qtyInputs[originalIndex] !== undefined ? qtyInputs[originalIndex] : String(item.qty);
                          const qtyNum = parseInt(currentQtyVal, 10);
                          const safeQty = isNaN(qtyNum) || qtyNum < 0 ? 0 : qtyNum;

                          const priceAfterDisc = Math.round(item.price * (1 - discPct / 100));
                          const lineTotal = priceAfterDisc * safeQty;

                          const skuStock = getSkuStock(item.code, item.series, item.color);
                          const availStock = skuStock ? skuStock.stockQty : 0;
                          const isShortage = skuStock && safeQty > availStock;

                          return (
                            <tr key={originalIndex} style={{ background: isShortage ? '#FEF2F2' : 'transparent' }}>
                              <td style={{ color: 'var(--ink-dim)' }}>{idx + 1}</td>
                              <td>
                                <b style={{ color: 'var(--navy)' }}>{item.name}</b>
                                <br />
                                <span style={{ fontSize: '11.5px', color: 'var(--ink-dim)' }}>CODE {item.code}</span>
                              </td>
                              <td>
                                <span className="badge b-blue">{item.color || 'Standard'}</span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {isShortage ? (
                                  <span className="badge b-bad" style={{ fontWeight: 800 }}>
                                    {availStock} avail (Shortage!)
                                  </span>
                                ) : (
                                  <span className="badge b-good">
                                    {availStock} avail
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <input
                                  type="number"
                                  min="1"
                                  className="fInput"
                                  style={{ width: '100px', textAlign: 'right', fontWeight: 700 }}
                                  value={currentQtyVal}
                                  onChange={(e) =>
                                    setQtyInputs((prev) => ({
                                      ...prev,
                                      [originalIndex]: e.target.value,
                                    }))
                                  }
                                />
                              </td>
                              <td style={{ textAlign: 'right' }}>{fmt(item.price)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--navy)', fontSize: '13px' }}>
                                {fmt(lineTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {/* Order Total Recalculation Card */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--navy)',
                  color: '#fff',
                  padding: '14px 20px',
                  borderRadius: '8px',
                  marginTop: '16px',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Calculated Order Post-Discount Total:</span>
                <span style={{ fontSize: '20px', fontWeight: 800 }}>{fmt(grandTotal)}</span>
              </div>
            </>
          )}
        </div>

        <div className="modalFoot" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <button
              type="button"
              className="btn b-bad"
              onClick={handleDeny}
              disabled={submitting}
            >
              Deny Order
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn b-ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Close
            </button>
            <button
              type="button"
              className="btn b-primary"
              onClick={() => handleSaveOrApprove(false)}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Edits (Keep Pending)'}
            </button>
            <button
              type="button"
              className="btn b-good"
              onClick={() => handleSaveOrApprove(true)}
              disabled={submitting || hasShortage}
              title={hasShortage ? 'Cannot approve: stock shortage' : 'Approve Order'}
            >
              {submitting ? 'Approving...' : 'Approve & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
