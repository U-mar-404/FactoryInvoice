import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface NavItemDef {
  key: string;
  label: string;
  icon: string;
}

const renderNavSvg = (iconName: string) => {
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
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    truck: '<rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths[iconName] || paths.grid }}
    />
  );
};

const DESKTOP_NAV: Record<string, NavItemDef[]> = {
  admin: [
    { key: 'users', label: 'User Accounts', icon: 'user' },
    { key: 'whatsapp', label: 'WhatsApp Settings', icon: 'phone' },
  ],
  customer: [
    { key: 'catalog', label: 'Catalog', icon: 'grid' },
    { key: 'myorders', label: 'My Orders', icon: 'list' },
    { key: 'account', label: 'Account', icon: 'user' },
  ],
  manager: [
    { key: 'orders', label: 'Orders', icon: 'list' },
    { key: 'stock', label: 'Stock', icon: 'box' },
    { key: 'products', label: 'Products', icon: 'layers' },
    { key: 'rates', label: 'Rate List', icon: 'tag' },
    { key: 'customers', label: 'Customers', icon: 'user' },
    { key: 'agents', label: 'Agents', icon: 'briefcase' },
    { key: 'receiving', label: 'Receiving', icon: 'coin' },
    { key: 'reports', label: 'Reports', icon: 'chart' },
    { key: 'whatsapp', label: 'WhatsApp Settings', icon: 'phone' },
  ],
  store: [
    { key: 'dispatch', label: 'Orders to Dispatch', icon: 'truck' },
    { key: 'stock', label: 'Stock', icon: 'box' },
  ],
};

export const Sidebar: React.FC = () => {
  const { user, activePage, setActivePage, cart, setIsCartOpen, logout } = useApp();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  if (!user) return null;

  const desktopItems = DESKTOP_NAV[user.role] || [];
  const activeIndex = desktopItems.findIndex((it) => it.key === activePage);

  const cartItemCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);

  // Mobile Bottom Nav Items based on Role:
  let mobileBottomItems: { key: string; label: string; icon: string; badge?: number; isSheetTrigger?: boolean; isCartTrigger?: boolean }[] = [];

  if (user.role === 'customer') {
    mobileBottomItems = [
      { key: 'catalog', label: 'Catalog', icon: 'grid' },
      { key: 'myorders', label: 'Orders', icon: 'list' },
      { key: 'cart', label: 'Cart', icon: 'cart', badge: cartItemCount, isCartTrigger: true },
      { key: 'account', label: 'Account', icon: 'user' },
    ];
  } else if (user.role === 'manager') {
    mobileBottomItems = [
      { key: 'orders', label: 'Orders', icon: 'list' },
      { key: 'stock', label: 'Stock', icon: 'box' },
      { key: 'rates', label: 'Rates', icon: 'tag' },
      { key: 'customers', label: 'Customers', icon: 'user' },
      { key: 'more', label: 'More', icon: 'more', isSheetTrigger: true },
    ];
  } else if (user.role === 'store') {
    mobileBottomItems = [
      { key: 'dispatch', label: 'Dispatch', icon: 'truck' },
      { key: 'stock', label: 'Stock', icon: 'box' },
      { key: 'more', label: 'Profile', icon: 'user', isSheetTrigger: true },
    ];
  } else if (user.role === 'admin') {
    mobileBottomItems = [
      { key: 'users', label: 'Users', icon: 'user' },
      { key: 'whatsapp', label: 'WhatsApp', icon: 'phone' },
      { key: 'more', label: 'Profile', icon: 'more', isSheetTrigger: true },
    ];
  }

  // Manager secondary links inside sheet:
  const managerSheetLinks = [
    { key: 'products', label: 'Products', sub: 'Configure SKUs', icon: 'layers' },
    { key: 'agents', label: 'Sales Agents', sub: 'Manage Reps', icon: 'briefcase' },
    { key: 'receiving', label: 'Receiving', sub: 'Log Payments', icon: 'coin' },
    { key: 'reports', label: 'Reports', sub: 'Sales & Analytics', icon: 'chart' },
    { key: 'whatsapp', label: 'WhatsApp', sub: 'Dispatch Alerts', icon: 'phone' },
  ];

  const handleBottomTabClick = (item: typeof mobileBottomItems[0]) => {
    if (item.isCartTrigger) {
      setIsCartOpen(true);
    } else if (item.isSheetTrigger) {
      setIsMoreSheetOpen(true);
    } else {
      setActivePage(item.key);
      setIsMoreSheetOpen(false);
    }
  };

  return (
    <>
      {/* 1. Desktop Fixed Left Sidebar */}
      <aside className="sidebar desktopSidebarOnly">
        <div className="brandmark">
          <span className="dot"></span> MESCO
        </div>
        <div className="navGroup">
          <div
            className="navPill"
            style={{ transform: `translateY(${activeIndex >= 0 ? activeIndex * 40 : 0}px)` }}
          ></div>
          {desktopItems.map((it) => (
            <button
              key={it.key}
              className={`navItem ${activePage === it.key ? 'active' : ''}`}
              onClick={() => setActivePage(it.key)}
            >
              {renderNavSvg(it.icon)}
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

      {/* 2. Mobile Top App Header */}
      <header className="mobileAppBar">
        <div className="mobileProfileBtn" onClick={() => setIsMoreSheetOpen(true)}>
          <div className="mobileAv">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="mobileUserTitle">
            <span className="mobileUserName">{user.name}</span>
            <span className="mobileRoleBadge">{user.role}</span>
          </div>
        </div>

        <div className="mobileBrandmark">
          <span className="dot"></span> MESCO
        </div>

        {user.role === 'customer' ? (
          <button className="mobileCartIconBtn" onClick={() => setIsCartOpen(true)} aria-label="View Cart">
            {renderNavSvg('cart')}
            {cartItemCount > 0 && <span className="mobileCartBadge">{cartItemCount}</span>}
          </button>
        ) : (
          <button className="mobileMoreIconBtn" onClick={() => setIsMoreSheetOpen(true)} aria-label="More Menu">
            {renderNavSvg('more')}
          </button>
        )}
      </header>

      {/* 3. Mobile Bottom Navigation Bar */}
      <nav className="mobileBottomNav">
        {mobileBottomItems.map((it) => {
          const isActive = activePage === it.key && !it.isSheetTrigger && !it.isCartTrigger;
          return (
            <button
              key={it.key}
              className={`mobileNavTab ${isActive ? 'active' : ''}`}
              onClick={() => handleBottomTabClick(it)}
            >
              <div className="tabIconWrap">
                {renderNavSvg(it.icon)}
                {Boolean(it.badge) && <span className="tabBadge">{it.badge}</span>}
              </div>
              <span className="tabLabel">{it.label}</span>
              {isActive && <div className="tabActiveIndicator"></div>}
            </button>
          );
        })}
      </nav>

      {/* 4. Mobile Bottom Sheet ("More" & Profile Drawer) */}
      <div
        className={`mobileSheetBackdrop ${isMoreSheetOpen ? 'open' : ''}`}
        onClick={() => setIsMoreSheetOpen(false)}
      ></div>

      <div className={`mobileBottomSheet ${isMoreSheetOpen ? 'open' : ''}`}>
        <div className="sheetHandleBar" onClick={() => setIsMoreSheetOpen(false)}>
          <div className="sheetHandle"></div>
        </div>

        {/* User Card inside Sheet */}
        <div className="sheetUserHeader">
          <div className="sheetAv">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="sheetUserMeta">
            <div className="sheetName">{user.name}</div>
            <div className="sheetSub">
              <span className="badge b-blue" style={{ textTransform: 'uppercase', fontSize: '10.5px' }}>
                {user.role}
              </span>
              {user.username && <span style={{ marginLeft: '8px', opacity: 0.7, fontSize: '12px' }}>@{user.username}</span>}
            </div>
          </div>
        </div>

        {/* Secondary Links Grid for Manager */}
        {user.role === 'manager' && (
          <div style={{ marginBottom: '16px' }}>
            <div className="sheetSectionTitle">Management Tools</div>
            <div className="sheetGrid">
              {managerSheetLinks.map((link) => (
                <button
                  key={link.key}
                  className={`sheetTile ${activePage === link.key ? 'active' : ''}`}
                  onClick={() => {
                    setActivePage(link.key);
                    setIsMoreSheetOpen(false);
                  }}
                >
                  <div className="tileIcon">{renderNavSvg(link.icon)}</div>
                  <div className="tileInfo">
                    <div className="tileTitle">{link.label}</div>
                    <div className="tileSub">{link.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sign Out Button */}
        <div className="sheetActions">
          <button
            type="button"
            className="btn b-bad fullWidth"
            style={{
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onClick={() => {
              setIsMoreSheetOpen(false);
              logout();
            }}
          >
            <span>🚪 Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};
