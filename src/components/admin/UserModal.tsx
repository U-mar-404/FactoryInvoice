import React, { useState, useEffect } from 'react';
import { Role, UserAccount } from '../../types';
import { useApp } from '../../context/AppContext';

interface UserModalProps {
  userAccount: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    username: string;
    name: string;
    password?: string;
    role: Role;
    phone?: string;
    area?: string;
    city?: string;
    address?: string;
    discount?: number;
  }) => Promise<void>;
}

const isValidPhone = (phoneStr: string): boolean => {
  if (!phoneStr) return false;
  const cleaned = phoneStr.replace(/[\s\-\(\)]/g, '');
  return /^\+?[0-9]{7,15}$/.test(cleaned);
};

export const UserModal: React.FC<UserModalProps> = ({ userAccount, isOpen, onClose, onSave }) => {
  const { addToast } = useApp();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('Gulberg');
  const [city, setCity] = useState('Lahore');
  const [address, setAddress] = useState('');
  const [discount, setDiscount] = useState('5');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userAccount) {
      setUsername(userAccount.username || '');
      setName(userAccount.name || '');
      setPassword('');
      setRole(userAccount.role || 'customer');
      setPhone(userAccount.customerPhone || '');
      setArea(userAccount.customerArea || 'Gulberg');
      setCity(userAccount.customerCity || 'Lahore');
      setAddress(userAccount.customerAddress || '');
      setDiscount(userAccount.customerDiscount !== undefined ? String(userAccount.customerDiscount) : '5');
    } else {
      setUsername('');
      setName('');
      setPassword('demo123');
      setRole('customer');
      setPhone('');
      setArea('Gulberg');
      setCity('Lahore');
      setAddress('');
      setDiscount('5');
    }
  }, [userAccount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) return;

    if (role === 'customer') {
      if (!phone.trim()) {
        addToast('Phone number is required for customer accounts', 'bad');
        return;
      }
      if (!isValidPhone(phone.trim())) {
        addToast('Invalid phone number format. Must contain 7 to 15 digits (e.g. 0300-1234567)', 'bad');
        return;
      }
    }

    setLoading(true);
    try {
      await onSave({
        username: username.trim().toLowerCase(),
        name: name.trim(),
        password: password ? password.trim() : undefined,
        role,
        phone: role === 'customer' ? phone.trim() : undefined,
        area: role === 'customer' ? area : undefined,
        city: role === 'customer' ? city : undefined,
        address: role === 'customer' ? address : undefined,
        discount: role === 'customer' ? parseFloat(discount || '0') : undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`modalOverlay ${isOpen ? 'open' : ''}`}>
      <div className="modal">
        <div className="modalHead">
          <h3>{userAccount ? `Edit User: ${userAccount.username}` : 'Create New User Account'}</h3>
          <button className="drawerClose" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modalBody">
            <div className="field">
              <label>Username</label>
              <input
                type="text"
                placeholder="e.g. jameel_traders"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Full Name / Business Name</label>
              <input
                type="text"
                placeholder="e.g. Jameel Electric Store"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>{userAccount ? 'New Password (leave blank to keep current)' : 'Password'}</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="customer">Customer</option>
                <option value="manager">Manager</option>
                <option value="store">Store Desk</option>
                <option value="admin">System Admin</option>
              </select>
            </div>

            {role === 'customer' && (
              <>
                <div className="field">
                  <label>Phone Number (Required)</label>
                  <input
                    type="text"
                    placeholder="e.g. 0300-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>City</label>
                  <input
                    type="text"
                    placeholder="e.g. Lahore, Faisalabad, Multan"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Area / Market</label>
                  <input
                    type="text"
                    placeholder="e.g. Gulberg, Brandreth Road"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Full Delivery Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Shop #12, Block B, Main Market"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Discount Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <div className="modalFoot">
            <button type="button" className="btn b-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn b-primary" disabled={loading}>
              {loading ? 'Saving...' : userAccount ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
