import React from 'react';
import { useApp } from '../../context/AppContext';
import { fmt } from '../../utils/formatters';

export const Account: React.FC = () => {
  const { user, payments, orders, custById } = useApp();

  const customer = user ? custById(user) : undefined;
  const targetId = customer ? customer.id : (user ? (user.customerId || user.id) : null);

  const myPayments = targetId
    ? payments.filter((p) => p.customerId === targetId || (user && p.customerId === user.id))
    : [];

  const myOrdersCount = targetId
    ? orders.filter((o) => o.customerId === targetId || (user && o.customerId === user.id)).length
    : 0;

  if (!customer) {
    return (
      <div className="page">
        <div className="pageHead">
          <div>
            <h1>Account</h1>
            <p className="sub">{user ? user.name : 'Customer Account'}</p>
          </div>
        </div>
        <div className="empty">Customer details loading...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>Account</h1>
          <p className="sub">
            {customer.name} · {customer.area}
          </p>
        </div>
      </div>

      <div className="statRow">
        <div className="statCard">
          <div className="lbl">Balance owed</div>
          <div className="val">{fmt(customer.balance)}</div>
        </div>
        <div className="statCard">
          <div className="lbl">Orders placed</div>
          <div className="val">{myOrdersCount}</div>
        </div>
      </div>

      <div className="card">
        <div className="cardHead">
          <h3>Payment history</h3>
        </div>
        <div className="tableResponsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {myPayments.length ? (
                myPayments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.date).toLocaleDateString()}</td>
                    <td>{fmt(p.amount)}</td>
                    <td>{p.note || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>
                    <div className="empty">No payments recorded yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
