import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { fmt, SERIES_LABEL } from '../../utils/formatters';
import { OrderReviewModal } from './OrderReviewModal';
import { apiClient } from '../../api/client';

export const CartDrawer: React.FC = () => {
  const { user, cart, isCartOpen, setIsCartOpen, removeFromCart, placeOrder } = useApp();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [seriesDiscounts, setSeriesDiscounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user && user.role === 'customer' && user.customerId) {
      apiClient.customers.getCustomerDetail(user.customerId)
        .then((detail) => {
          const discountsMap: Record<string, number> = {};
          if (detail.seriesDiscounts) {
            detail.seriesDiscounts.forEach((sd) => {
              discountsMap[sd.seriesName.toLowerCase()] = sd.discountPercent;
            });
          }
          setSeriesDiscounts(discountsMap);
        })
        .catch(() => {});
    }
  }, [user, isCartOpen]);

  const items = Object.entries(cart);
  const subtotal = items.reduce((sum, [, i]) => sum + i.price * i.qty, 0);

  const handleContinue = () => {
    setIsReviewOpen(true);
  };

  const handleConfirmOrder = async () => {
    await placeOrder();
    setIsReviewOpen(false);
    setIsCartOpen(false);
  };

  return (
    <>
      <div
        className={`drawerOverlay ${isCartOpen ? 'open' : ''}`}
        onClick={() => setIsCartOpen(false)}
      ></div>
      <div className={`drawer ${isCartOpen ? 'open' : ''}`}>
        <div className="drawerHead">
          <h3>Your order</h3>
          <button className="drawerClose" onClick={() => setIsCartOpen(false)}>
            ✕
          </button>
        </div>
        <div className="drawerBody">
          {!items.length ? (
            <div className="empty">
              <div className="ic">🛒</div>
              <b>Your cart is empty</b>Add items from the catalog.
            </div>
          ) : (
            items.map(([key, item]) => (
              <div key={key} className="cartLine">
                <div>
                  <div className="nm">{item.name}</div>
                  <div className="meta">
                    {SERIES_LABEL[item.series] || item.series} ({item.color || 'Standard'}) · {item.qty} pcs × {fmt(item.price)}
                  </div>
                </div>
                <button className="rm" onClick={() => removeFromCart(key)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="drawerFoot">
            <div className="sumRow tot">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <button className="btnPrimary" onClick={handleContinue}>
              Continue
            </button>
          </div>
        )}
      </div>

      {/* Order Review Modal */}
      <OrderReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirm={handleConfirmOrder}
        cart={cart}
        seriesDiscounts={seriesDiscounts}
      />
    </>
  );
};
