import React, { useState } from 'react';
import { CartItem } from '../../types';
import { fmt } from '../../utils/formatters';

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  cart: Record<string, CartItem>;
  seriesDiscounts: Record<string, number>;
}

export const OrderReviewModal: React.FC<OrderReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cart,
  seriesDiscounts,
}) => {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const items = Object.values(cart);

  // Group items by series in the order they were added
  const seriesGroups: { seriesName: string; items: CartItem[] }[] = [];
  const groupMap: Record<string, CartItem[]> = {};

  items.forEach((item) => {
    const sName = item.series || 'Standard';
    if (!groupMap[sName]) {
      groupMap[sName] = [];
      seriesGroups.push({ seriesName: sName, items: groupMap[sName] });
    }
    groupMap[sName].push(item);
  });

  let overallSubtotal = 0;
  let overallDiscount = 0;
  let overallGrandTotal = 0;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay open">
      <div className="modal" style={{ width: '800px', maxWidth: '95vw' }}>
        <div className="modalHead">
          <h3>Review Your Order</h3>
          <button className="drawerClose" onClick={onClose} disabled={submitting}>
            ✕
          </button>
        </div>

        <div className="modalBody" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          <p className="sub" style={{ marginTop: 0, marginBottom: '16px' }}>
            Verify your order items grouped by product series and per-series discounts before confirming.
          </p>

          {seriesGroups.map((group, groupIdx) => {
            const sDiscount = seriesDiscounts[group.seriesName.toLowerCase()] ?? 0;
            let sectionSub = 0;
            let sectionDisc = 0;
            let sectionTotal = 0;

            const rows = group.items.map((item, itemIdx) => {
              const lineSub = item.price * item.qty;
              const priceAfterDisc = Math.round(item.price * (1 - sDiscount / 100));
              const lineTotal = priceAfterDisc * item.qty;
              const lineDiscAmt = lineSub - lineTotal;

              sectionSub += lineSub;
              sectionDisc += lineDiscAmt;
              sectionTotal += lineTotal;

              return {
                index: itemIdx + 1,
                item,
                priceAfterDisc,
                lineTotal,
              };
            });

            overallSubtotal += sectionSub;
            overallDiscount += sectionDisc;
            overallGrandTotal += sectionTotal;

            return (
              <div
                key={group.seriesName}
                style={{
                  marginBottom: '24px',
                  background: '#fff',
                  border: '1.5px solid var(--line)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                {/* Series Section Header */}
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    padding: '12px 16px',
                    borderBottom: '1.5px solid var(--line)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--navy)' }}>
                    {group.seriesName} Series
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                    Customer Discount Rate:{' '}
                    <span className="badge b-blue" style={{ fontSize: '12px', marginLeft: '4px' }}>
                      {sDiscount}%
                    </span>
                  </div>
                </div>

                {/* Series Line Item Table */}
                <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#FAFBFD', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                      <th style={{ padding: '8px 12px', width: '32px' }}>#</th>
                      <th style={{ padding: '8px 12px' }}>Item</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Price</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Discount %</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Price After Discount</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ index, item, priceAfterDisc, lineTotal }) => (
                      <tr key={`${item.code}-${item.color}`} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--ink-dim)' }}>{index}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{item.name}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-dim)' }}>
                            CODE {item.code} · Color: <b>{item.color || 'Standard'}</b>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(item.price)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{sDiscount}%</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt(priceAfterDisc)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{item.qty} pcs</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }}>
                          {fmt(lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#FAFBFD', fontWeight: 700 }}>
                      <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--ink-dim)' }}>
                        {group.seriesName} Subtotal:
                      </td>
                      <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right', fontSize: '13.5px', color: 'var(--navy)' }}>
                        {fmt(sectionTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}

          {/* Combined Order Grand Total Summary */}
          <div
            style={{
              background: 'var(--navy)',
              color: '#fff',
              padding: '16px 20px',
              borderRadius: '10px',
              marginTop: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13.5px', opacity: 0.9 }}>
              <span>Combined Subtotal:</span>
              <span>{fmt(overallSubtotal)}</span>
            </div>
            {overallDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13.5px', color: '#6EE7B7' }}>
                <span>Total Discount Savings Across All Series:</span>
                <span>-{fmt(overallDiscount)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '18px',
                fontWeight: 800,
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                paddingTop: '10px',
              }}
            >
              <span>Grand Total:</span>
              <span>{fmt(overallGrandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="modalFoot">
          <button type="button" className="btn b-ghost" onClick={onClose} disabled={submitting}>
            Back to Cart
          </button>
          <button type="button" className="btn b-primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Placing Order...' : 'Confirm order'}
          </button>
        </div>
      </div>
    </div>
  );
};
