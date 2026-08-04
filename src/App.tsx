import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Login } from './components/auth/Login';
import { Sidebar } from './components/layout/Sidebar';
import { Catalog } from './components/customer/Catalog';
import { MyOrders } from './components/customer/MyOrders';
import { Account } from './components/customer/Account';
import { ManagerOrders } from './components/manager/ManagerOrders';
import { Customers } from './components/manager/Customers';
import { AgentsPage } from './components/manager/AgentsPage';
import { StockPage } from './components/common/StockPage';
import { Receiving } from './components/manager/Receiving';
import { Reports } from './components/manager/Reports';
import { Dispatch } from './components/store/Dispatch';
import { UsersPage } from './components/admin/UsersPage';
import { ProductsPage } from './components/manager/ProductsPage';
import { WhatsAppSettingsPage } from './components/manager/WhatsAppSettingsPage';
import { CartFab } from './components/customer/CartFab';
import { CartDrawer } from './components/customer/CartDrawer';
import { ToastContainer } from './components/layout/Toast';

const AppContent: React.FC = () => {
  const { user, activePage } = useApp();

  if (!user) {
    return (
      <>
        <Login />
        <ToastContainer />
      </>
    );
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'users':
        return <UsersPage />;
      case 'catalog':
        return <Catalog />;
      case 'myorders':
        return <MyOrders />;
      case 'account':
        return <Account />;
      case 'orders':
        return <ManagerOrders />;
      case 'stock':
        return <StockPage />;
      case 'products':
        return <ProductsPage />;
      case 'customers':
        return <Customers />;
      case 'agents':
        return <AgentsPage />;
      case 'receiving':
        return <Receiving />;
      case 'reports':
        return <Reports />;
      case 'dispatch':
        return <Dispatch />;
      case 'whatsapp':
        return <WhatsAppSettingsPage />;
      default:
        if (user.role === 'admin') return <UsersPage />;
        if (user.role === 'manager') return <ManagerOrders />;
        if (user.role === 'store') return <Dispatch />;
        return <Catalog />;
    }
  };

  return (
    <div id="mainScreen">
      <Sidebar />
      <main className="content">
        <ErrorBoundary>
          {renderActivePage()}
        </ErrorBoundary>
      </main>
      <CartFab />
      <CartDrawer />
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
