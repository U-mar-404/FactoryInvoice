import React from 'react';
import { useApp } from '../../context/AppContext';

interface NavItemDef {
  key: string;
  label: string;
  icon: JSX.Element;
}

const renderIcon = (name: string) => {
  const paths: Record<string, string> = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    list: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    tag: '<path d="M3 12l9-9h7v7l-9 9-7-7z"/><circle cx="15" cy="9" r="1.2"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/>',
    chart: '<path d="M4 20V10M11 20V4M18 20v-7"/>',
    box: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths[name] || paths.grid }}
    />
  );
};

const NAV_CONFIG: Record<string, NavItemDef[]> = {
  admin: [
    { key: 'users', label: 'User Accounts', icon: renderIcon('user') },
    { key: 'whatsapp', label: 'WhatsApp Settings', icon: renderIcon('phone') },
  ],
  customer: [
    { key: 'catalog', label: 'Catalog', icon: renderIcon('grid') },
    { key: 'myorders', label: 'My Orders', icon: renderIcon('list') },
    { key: 'account', label: 'Account', icon: renderIcon('user') },
  ],
  manager: [
    { key: 'orders', label: 'Orders', icon: renderIcon('list') },
    { key: 'stock', label: 'Stock', icon: renderIcon('box') },
    { key: 'products', label: 'Products', icon: renderIcon('layers') },
    { key: 'rates', label: 'Rate List', icon: renderIcon('tag') },
    { key: 'customers', label: 'Customers', icon: renderIcon('user') },
    { key: 'agents', label: 'Agents', icon: renderIcon('briefcase') },
    { key: 'receiving', label: 'Receiving', icon: renderIcon('coin') },
    { key: 'reports', label: 'Reports', icon: renderIcon('chart') },
    { key: 'whatsapp', label: 'WhatsApp Settings', icon: renderIcon('phone') },
  ],
  store: [
    { key: 'dispatch', label: 'Orders to Dispatch', icon: renderIcon('box') },
    { key: 'stock', label: 'Stock', icon: renderIcon('layers') },
  ],
};

export const Sidebar: React.FC = () => {
  const { user, activePage, setActivePage, logout } = useApp();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  if (!user) return null;

  const items = NAV_CONFIG[user.role] || [];
  const activeIndex = items.findIndex((it) => it.key === activePage);

  const handleNavClick = (key: string) => {
    setActivePage(key);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Navigation Header */}
      <header className="mobileHeader">
        <button
          type="button"
          className="mobileMenuBtn"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          aria-label="Toggle Navigation Menu"
        >
          {isMobileOpen ? '✕' : '☰'}
        </button>
        <div className="brandmark">
          <span className="dot"></span> MESCO
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge b-blue" style={{ textTransform: 'uppercase', fontSize: '10.5px', padding: '3px 8px' }}>
            {user.role}
          </span>
        </div>
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      <div
        className={`sidebarOverlay ${isMobileOpen ? 'open' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      ></div>

      {/* Main Sidebar (Desktop fixed & Mobile drawer) */}
      <aside className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
        <div className="brandmark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="dot"></span> MESCO
          </div>
          <button
            type="button"
            className="mobileCloseBtn"
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', padding: '4px' }}
            onClick={() => setIsMobileOpen(false)}
          >
            ✕
          </button>
        </div>
        <div className="navGroup">
          <div
            className="navPill"
            style={{ transform: `translateY(${activeIndex >= 0 ? activeIndex * 40 : 0}px)` }}
          ></div>
          {items.map((it) => (
            <button
              key={it.key}
              className={`navItem ${activePage === it.key ? 'active' : ''}`}
              onClick={() => handleNavClick(it.key)}
            >
              {it.icon}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
        <div className="sidebarFoot">
          <div className="userChip">
            <div className="av">{user.name.slice(0, 1).toUpperCase()}</div>
            <div className="who">
              <div className="n">{user.name}</div>
              <div className="r">{user.role[0].toUpperCase() + user.role.slice(1)}</div>
            </div>
          </div>
          <button className="logoutBtn" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};
