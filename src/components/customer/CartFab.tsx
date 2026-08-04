import React from 'react';
import { useApp } from '../../context/AppContext';

export const CartFab: React.FC = () => {
  const { user, activePage, cart, setIsCartOpen } = useApp();

  if (!user || user.role !== 'customer' || activePage !== 'catalog') {
    return null;
  }

  const count = Object.values(cart).reduce((s, i) => s + i.qty, 0);

  return (
    <button
      className="cartFab no-print"
      onClick={() => setIsCartOpen(true)}
    >
      🛒 Cart <span className="n">{count}</span>
    </button>
  );
};
