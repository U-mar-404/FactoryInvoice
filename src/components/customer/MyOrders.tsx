import React from 'react';
import { useApp } from '../../context/AppContext';
import { OrdersTable } from '../common/OrdersTable';

export const MyOrders: React.FC = () => {
  const { user, orders, custById } = useApp();

  const customer = user ? custById(user) : undefined;
  const targetId = customer ? customer.id : (user ? (user.customerId || user.id) : null);

  const myOrders = targetId
    ? orders.filter(
        (o) =>
          o.customerId === targetId ||
          (user && o.customerId === user.id) ||
          (user && user.name && o.customerName.toLowerCase() === user.name.toLowerCase())
      )
    : [];

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>My Orders</h1>
          <p className="sub">Track status from placement to dispatch.</p>
        </div>
      </div>
      <div className="card">
        <OrdersTable orders={myOrders} viewer="customer" />
      </div>
    </div>
  );
};
