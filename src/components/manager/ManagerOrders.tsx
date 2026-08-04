import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, OrderStatus } from '../../types';
import { OrdersTable } from '../common/OrdersTable';
import { ManagerOrderReviewModal } from './ManagerOrderReviewModal';

export const ManagerOrders: React.FC = () => {
  const { orders, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<OrderStatus>('pending');
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const approvedCount = orders.filter((o) => o.status === 'approved').length;
  const dispatchedCount = orders.filter((o) => o.status === 'dispatched').length;
  const deniedCount = orders.filter((o) => o.status === 'denied').length;

  // Filter orders by active category tab
  const categoryOrders = orders.filter((o) => o.status.toLowerCase() === activeTab.toLowerCase());

  const getTabTitle = () => {
    switch (activeTab) {
      case 'pending':
        return 'Waiting for Approval';
      case 'approved':
        return 'Approved Orders';
      case 'dispatched':
        return 'Dispatched Orders';
      case 'denied':
        return 'Denied Orders';
      default:
        return 'Orders';
    }
  };

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>Orders Management</h1>
          <p className="sub">Review, approve, adjust, and track customer orders by status category.</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--line)', marginBottom: '20px' }}>
        <button
          className={`btn ${activeTab === 'pending' ? 'b-primary' : 'b-ghost'}`}
          style={{ borderRadius: '8px 8px 0 0', fontWeight: 700 }}
          onClick={() => setActiveTab('pending')}
        >
          Waiting for Approval {pendingCount > 0 && <span className="badge b-warn" style={{ marginLeft: '6px' }}>{pendingCount}</span>}
        </button>

        <button
          className={`btn ${activeTab === 'approved' ? 'b-primary' : 'b-ghost'}`}
          style={{ borderRadius: '8px 8px 0 0', fontWeight: 700 }}
          onClick={() => setActiveTab('approved')}
        >
          Approved ({approvedCount})
        </button>

        <button
          className={`btn ${activeTab === 'dispatched' ? 'b-primary' : 'b-ghost'}`}
          style={{ borderRadius: '8px 8px 0 0', fontWeight: 700 }}
          onClick={() => setActiveTab('dispatched')}
        >
          Dispatched ({dispatchedCount})
        </button>

        <button
          className={`btn ${activeTab === 'denied' ? 'b-primary' : 'b-ghost'}`}
          style={{ borderRadius: '8px 8px 0 0', fontWeight: 700 }}
          onClick={() => setActiveTab('denied')}
        >
          Denied ({deniedCount})
        </button>
      </div>

      {/* Orders Table for Active Category */}
      <div className="card">
        <OrdersTable
          orders={categoryOrders}
          viewer="manager"
          title={getTabTitle()}
          onRowClick={(order) => {
            if (activeTab === 'pending' || order.status === 'pending') {
              setReviewOrder(order);
            }
          }}
          onModify={(id) => {
            const target = orders.find((o) => o.id === id);
            if (target) setReviewOrder(target);
          }}
        />
      </div>

      {/* Manager Order Review & Edit Modal */}
      {reviewOrder && (
        <ManagerOrderReviewModal
          order={reviewOrder}
          onClose={() => setReviewOrder(null)}
          onSaveSuccess={() => {
            refreshData();
          }}
        />
      )}
    </div>
  );
};
