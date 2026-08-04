import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { SERIES_LABEL } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';

interface ModifyModalProps {
  order: Order | null;
  onClose: () => void;
}

export const ModifyModal: React.FC<ModifyModalProps> = ({ order, onClose }) => {
  const { modifyOrderItems } = useApp();
  const [qtyMap, setQtyMap] = useState<Record<number, number>>({});

  useEffect(() => {
    if (order) {
      const initialMap: Record<number, number> = {};
      order.items.forEach((it, idx) => {
        initialMap[idx] = it.qty;
      });
      setQtyMap(initialMap);
    }
  }, [order]);

  if (!order) return null;

  const handleSave = async () => {
    await modifyOrderItems(order.id, qtyMap);
    onClose();
  };

  return (
    <div className={`modalOverlay ${order ? 'open' : ''}`}>
      <div className="modal">
        <div className="modalHead">
          <h3>Modify order {order.id.slice(-6).toUpperCase()}</h3>
          <button className="drawerClose" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modalBody">
          {order.items.map((it, idx) => (
            <div key={idx} className="modLine">
              <span className="nm">
                {it.name}{' '}
                <span style={{ color: 'var(--ink-dim)' }}>
                  ({SERIES_LABEL[it.series]})
                </span>
              </span>
              <input
                type="number"
                min="0"
                value={qtyMap[idx] !== undefined ? qtyMap[idx] : it.qty}
                onChange={(e) =>
                  setQtyMap({
                    ...qtyMap,
                    [idx]: parseInt(e.target.value || '0', 10),
                  })
                }
              />
            </div>
          ))}
          <p style={{ fontSize: '12px', color: 'var(--ink-dim)', marginTop: '12px' }}>
            Set a quantity to 0 to remove an item. Changes apply immediately and the order moves to <b>Approved</b> — the customer sees the final version, no separate approval needed from them.
          </p>
        </div>
        <div className="modalFoot">
          <button className="btn b-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn b-primary" onClick={handleSave}>
            Save &amp; approve
          </button>
        </div>
      </div>
    </div>
  );
};
