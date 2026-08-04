import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Role, UserAccount } from '../../types';
import { UserModal } from './UserModal';

export const UsersPage: React.FC = () => {
  const { usersList, fetchUsersList, createUserAccount, updateUserAccount, deleteUserAccount } = useApp();
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchUsersList();
  }, []);

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (data: {
    username: string;
    name: string;
    password?: string;
    role: Role;
    area?: string;
    discount?: number;
  }) => {
    if (selectedUser) {
      await updateUserAccount(selectedUser.id, data);
    } else {
      await createUserAccount(data);
    }
  };

  const renderRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return <span className="badge approved">System Admin</span>;
      case 'manager':
        return <span className="badge dispatched">Manager</span>;
      case 'store':
        return <span className="badge pending">Store Desk</span>;
      case 'customer':
        return <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--ink)' }}>Customer</span>;
      default:
        return <span className="badge">{role}</span>;
    }
  };

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1>User Accounts &amp; Access Control</h1>
          <p className="sub">Admin dashboard: Create accounts, assign roles, and manage permissions.</p>
        </div>
        <div className="btnRow">
          <button className="btn b-primary" onClick={handleOpenCreate}>
            + Create User Account
          </button>
        </div>
      </div>

      <div className="statRow">
        <div className="statCard">
          <div className="lbl">Total Accounts</div>
          <div className="val">{usersList.length}</div>
        </div>
        <div className="statCard">
          <div className="lbl">System Admins</div>
          <div className="val">{usersList.filter((u) => u.role === 'admin').length}</div>
        </div>
        <div className="statCard">
          <div className="lbl">Managers</div>
          <div className="val">{usersList.filter((u) => u.role === 'manager').length}</div>
        </div>
        <div className="statCard">
          <div className="lbl">Store Desks</div>
          <div className="val">{usersList.filter((u) => u.role === 'store').length}</div>
        </div>
        <div className="statCard">
          <div className="lbl">Customers</div>
          <div className="val">{usersList.filter((u) => u.role === 'customer').length}</div>
        </div>
      </div>

      <div className="card">
        <div className="tableResponsive">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Role</th>
                <th>Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} className="rowIn">
                  <td>
                    <b>{u.username}</b>
                  </td>
                  <td>{u.name}</td>
                  <td>{renderRoleBadge(u.role)}</td>
                  <td>
                    {u.role === 'customer' ? (
                      <span style={{ fontSize: '12px', color: 'var(--ink-dim)' }}>
                        Phone: {u.customerPhone || '—'} · Area: {u.customerArea || '—'} · Discount: {u.customerDiscount ?? 0}%
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--ink-dim)' }}>System User</span>
                    )}
                  </td>
                  <td>
                    <div className="btnRow">
                      <button
                        className="btn b-ghost small"
                        onClick={() => handleOpenEdit(u)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn b-bad small"
                        onClick={() => deleteUserAccount(u.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal
        isOpen={isModalOpen}
        userAccount={selectedUser}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
      />
    </div>
  );
};
