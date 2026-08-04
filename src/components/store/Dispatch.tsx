import React from 'react';
import { useApp } from '../../context/AppContext';
import { OrdersTable } from '../common/OrdersTable';

export const Dispatch: React.FC = () => {
  const { orders } = useApp();

  const storeOrders = orders
    .filter((o) => o.status === 'approved' || o.status === 'dispatched')
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>Orders to Dispatch</h1>
          <p className="sub">Approved orders ready to go out. Print, then mark dispatched.</p>
        </div>
      </div>
      <div className="card">
        <OrdersTable orders={storeOrders} viewer="store" />
      </div>
    </div>
  );
};
