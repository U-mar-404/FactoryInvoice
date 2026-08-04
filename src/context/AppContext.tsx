import React, { createContext, useContext, useState, useEffect } from 'react';
import { CatalogItem, Customer, Order, Payment, User, Role, Series, CartItem, ToastItem, OrderStatus, UserAccount } from '../types';
import { uid, orderTotal } from '../utils/formatters';
import { apiClient } from '../api/client';



const DEFAULT_CUSTOMERS: Customer[] = [
  { id: 'c1', username: 'ali traders', name: 'Ali Traders', phone: '0300-1234567', area: 'Lahore', discount: 5, balance: 0 },
  { id: 'c2', username: 'khan electricals', name: 'Khan Electricals', phone: '0321-9876543', area: 'Faisalabad', discount: 8, balance: 0 },
  { id: 'c3', username: 'malik hardware', name: 'Malik Hardware', phone: '0345-5551234', area: 'Sargodha', discount: 3, balance: 0 },
];

const DEFAULT_USERS_LIST: UserAccount[] = [
  { id: 'u_admin', username: 'admin', name: 'System Admin', role: 'admin' },
  { id: 'u_mgr', username: 'manager', name: 'Manager', role: 'manager' },
  { id: 'u_store', username: 'store', name: 'Store Desk', role: 'store' },
  { id: 'c1', username: 'ali traders', name: 'Ali Traders', role: 'customer', customerPhone: '0300-1234567', customerArea: 'Lahore', customerDiscount: 5 },
  { id: 'c2', username: 'khan electricals', name: 'Khan Electricals', role: 'customer', customerPhone: '0321-9876543', customerArea: 'Faisalabad', customerDiscount: 8 },
  { id: 'c3', username: 'malik hardware', name: 'Malik Hardware', role: 'customer', customerPhone: '0345-5551234', customerArea: 'Sargodha', customerDiscount: 3 },
];

function getStored<T>(key: string, def: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : def;
  } catch (e) {
    return def;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

interface AppContextType {
  user: User | null;
  catalog: CatalogItem[];
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  usersList: UserAccount[];
  cart: Record<string, CartItem>;
  isCartOpen: boolean;
  activePage: string;
  toasts: ToastItem[];
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  setActivePage: (page: string) => void;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (code: string, series: Series, qty: number, color?: string) => void;
  removeFromCart: (key: string) => void;
  placeOrder: () => Promise<void>;
  setOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  modifyOrderItems: (orderId: string, updatedQtyMap: Record<number, number>) => Promise<void>;
  dispatchOrder: (orderId: string) => Promise<void>;
  logPayment: (customerId: string, amount: number, note?: string) => Promise<void>;
  updatePayment: (paymentId: string, amount: number, note?: string) => Promise<void>;
  updateCatalogRate: (code: string, series: Series, price: number | null) => Promise<void>;
  addCatalogItem: (item: CatalogItem) => Promise<void>;
  removeCatalogItem: (index: number) => Promise<void>;
  updateCustomerDiscount: (index: number, discount: number) => Promise<void>;
  fetchUsersList: () => Promise<void>;
  createUserAccount: (data: { username: string; name: string; password?: string; role: Role; phone?: string; area?: string; discount?: number }) => Promise<void>;
  updateUserAccount: (id: string, data: { username?: string; name?: string; password?: string; role?: Role; phone?: string; area?: string; discount?: number }) => Promise<void>;
  deleteUserAccount: (id: string) => Promise<void>;
  addToast: (msg: string, kind?: 'good' | 'bad') => void;
  custById: (idOrUser: string | User | null | undefined) => Customer | undefined;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    const res = getStored('catalog', []);
    return Array.isArray(res) ? res : [];
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const res = getStored('customers', DEFAULT_CUSTOMERS);
    return Array.isArray(res) ? res : DEFAULT_CUSTOMERS;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const res = getStored('orders', []);
    return Array.isArray(res) ? res : [];
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    const res = getStored('payments', []);
    return Array.isArray(res) ? res : [];
  });
  const [usersList, setUsersList] = useState<UserAccount[]>(() => {
    const res = getStored('usersList', DEFAULT_USERS_LIST);
    return Array.isArray(res) ? res : DEFAULT_USERS_LIST;
  });
  const [user, setUser] = useState<User | null>(() => getStored('user', null));
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activePage, setActivePage] = useState<string>(() => user ? getInitialPageForRole(user.role) : 'catalog');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => { setStored('catalog', catalog); }, [catalog]);
  useEffect(() => { setStored('customers', customers); }, [customers]);
  useEffect(() => { setStored('orders', orders); }, [orders]);
  useEffect(() => { setStored('payments', payments); }, [payments]);
  useEffect(() => { setStored('usersList', usersList); }, [usersList]);
  useEffect(() => { setStored('user', user); }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (user && token) {
      refreshData();
      if (user.role === 'admin') fetchUsersList();
    } else if (user && !token) {
      logout();
    }
  }, []);

  const addToast = (msg: string, kind?: 'good' | 'bad') => {
    const id = uid('t_');
    setToasts((prev) => [...prev, { id, msg, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__onApiError = (msg: string) => addToast(msg, 'bad');
    }
  }, []);

  const custById = (idOrUser: string | User | null | undefined): Customer | undefined => {
    if (!idOrUser) return undefined;
    if (typeof idOrUser === 'object') {
      const uObj = idOrUser as User;
      return customers.find(
        (c) =>
          (uObj.customerId && c.id === uObj.customerId) ||
          c.id === uObj.id ||
          (uObj.username && c.username.toLowerCase() === uObj.username.toLowerCase())
      );
    }
    return customers.find(
      (c) => c.id === idOrUser || c.username.toLowerCase() === idOrUser.toLowerCase()
    );
  };

  const getInitialPageForRole = (role: Role): string => {
    switch (role) {
      case 'admin':
        return 'users';
      case 'manager':
        return 'orders';
      case 'store':
        return 'dispatch';
      case 'customer':
      default:
        return 'catalog';
    }
  };

  const refreshData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const [catData, custData, ordData, payData] = await Promise.all([
        apiClient.catalog.getCatalog().catch(() => null),
        apiClient.customers.getCustomers().catch(() => null),
        apiClient.orders.getOrders().catch(() => null),
        apiClient.payments.getPayments().catch(() => null),
      ]);

      if (catData) setCatalog(catData);
      if (custData) setCustomers(custData);
      if (ordData) setOrders(ordData);
      if (payData) setPayments(payData);
    } catch (e: any) {
      console.warn('[refreshData] Sync error:', e);
    }
  };

  const fetchUsersList = async () => {
    try {
      const users = await apiClient.admin.getUsers();
      setUsersList(users);
    } catch (e) {
      console.warn('Using local users list state');
    }
  };

  const login = async (username: string, password?: string): Promise<boolean> => {
    const uname = username.trim().toLowerCase();
    const passStr = (password || '').trim();

    if (!uname || !passStr) {
      return false;
    }

    try {
      const authRes = await apiClient.auth.login(uname, passStr);
      setUser(authRes.user);
      setStored('user', authRes.user);
      setActivePage(getInitialPageForRole(authRes.user.role));
      await refreshData();
      if (authRes.user.role === 'admin') await fetchUsersList();
      return true;
    } catch (apiErr) {
      console.error('[login] Authentication failed:', apiErr);
      return false;
    }
  };

  const logout = () => {
    apiClient.auth.logout();
    setUser(null);
    localStorage.removeItem('user');
    setCart({});
    setIsCartOpen(false);
  };

  const addToCart = (code: string, series: Series, qty: number, color?: string) => {
    const item = catalog.find((i) => i.code === code);
    if (!item) return;

    let price = item.prices[series];
    if (color && item.colorsBySeries && item.colorsBySeries[series]) {
      const matched = item.colorsBySeries[series].find((c) => c.name.toLowerCase() === color.toLowerCase());
      if (matched && matched.price !== null) {
        price = matched.price;
      }
    }

    if (price == null) return;

    const colorName = color || 'Standard';
    const key = `${code}-${series}-${colorName}`;

    setCart((prev) => {
      const existing = prev[key];
      const newQty = existing ? existing.qty + qty : qty;
      return {
        ...prev,
        [key]: { code, name: item.name, series, color: colorName, price, qty: newQty },
      };
    });
    addToast(`Added ${item.name} (${series} - ${colorName}) ×${qty}`, 'good');
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const placeOrder = async () => {
    if (!user || user.role !== 'customer') return;
    const itemsList = Object.values(cart);
    if (!itemsList.length) return;

    try {
      const placedOrder = await apiClient.orders.placeOrder(
        itemsList.map((i) => ({ code: i.code, series: i.series, color: i.color, qty: i.qty }))
      );
      setOrders((prev) => [placedOrder, ...prev]);
    } catch (e) {
      const c = custById(user.id);
      if (!c) return;
      const newOrder: Order = {
        id: uid('ord_'),
        customerId: c.id,
        customerName: c.name,
        discount: c.discount || 0,
        items: itemsList.map((i) => ({
          code: i.code,
          name: i.name,
          series: i.series,
          color: i.color,
          price: i.price,
          qty: i.qty,
        })),
        status: 'pending',
        createdAt: Date.now(),
        history: [{ s: 'pending', t: Date.now() }],
      };
      setOrders((prev) => [newOrder, ...prev]);
    }

    setCart({});
    setIsCartOpen(false);
    addToast('Order placed — waiting on manager approval', 'good');
  };

  const setOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const updatedOrder = await apiClient.orders.setStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
    } catch (e) {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            status,
            history: [...o.history, { s: status, t: Date.now() }],
          };
        })
      );
    }
    addToast(
      `Order ${orderId.slice(-6).toUpperCase()} ${status}`,
      status === 'denied' ? 'bad' : 'good'
    );
  };

  const modifyOrderItems = async (orderId: string, updatedQtyMap: Record<number, number>) => {
    try {
      const updatedOrder = await apiClient.orders.modifyItems(orderId, updatedQtyMap);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
    } catch (e) {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const modifiedItems = o.items
            .map((item, idx) => ({
              ...item,
              qty: updatedQtyMap[idx] !== undefined ? updatedQtyMap[idx] : item.qty,
            }))
            .filter((item) => item.qty > 0);

          return {
            ...o,
            items: modifiedItems,
            status: 'approved',
            history: [...o.history, { s: 'modified', t: Date.now() }],
          };
        })
      );
    }
    addToast('Order modified and approved', 'good');
  };

  const dispatchOrder = async (orderId: string) => {
    try {
      const res = await apiClient.orders.dispatch(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      await refreshData();
      addToast(
        `Order dispatched — Rs ${res.totalAddedToBalance.toLocaleString()} added to ${res.customerName}'s balance`,
        'good'
      );
    } catch (e) {
      let orderTotalVal = 0;
      let customerIdToUpdate = '';
      let custName = '';

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          orderTotalVal = orderTotal(o).total;
          customerIdToUpdate = o.customerId;
          custName = o.customerName;
          return {
            ...o,
            status: 'dispatched',
            history: [...o.history, { s: 'dispatched', t: Date.now() }],
          };
        })
      );

      if (customerIdToUpdate) {
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id !== customerIdToUpdate) return c;
            return { ...c, balance: c.balance + orderTotalVal };
          })
        );
      }

      addToast(
        `Order dispatched — Rs ${orderTotalVal.toLocaleString()} added to ${custName}'s balance`,
        'good'
      );
    }
  };

  const logPayment = async (customerId: string, amount: number, note?: string) => {
    if (amount <= 0) {
      addToast('Enter a valid amount', 'bad');
      return;
    }

    try {
      await apiClient.payments.logPayment(customerId, amount, note);
      await refreshData();
    } catch (e) {
      const payment: Payment = {
        id: uid('pay_'),
        customerId,
        amount,
        note,
        date: Date.now(),
      };
      setPayments((prev) => [payment, ...prev]);
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== customerId) return c;
          return { ...c, balance: c.balance - amount };
        })
      );
    }

    addToast('Payment logged', 'good');
  };

  const updatePayment = async (paymentId: string, amount: number, note?: string) => {
    if (amount <= 0) {
      addToast('Enter a valid amount', 'bad');
      return;
    }

    try {
      await apiClient.payments.updatePayment(paymentId, amount, note);
      await refreshData();
      addToast('Payment updated & balance recalculated', 'good');
    } catch (e) {
      const existing = payments.find((p) => p.id === paymentId);
      if (existing) {
        const oldAmt = existing.amount;
        const diff = oldAmt - amount;
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, amount, note: note !== undefined ? note : p.note } : p))
        );
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id !== existing.customerId) return c;
            return { ...c, balance: c.balance + diff };
          })
        );
      }
      addToast('Payment updated & balance recalculated', 'good');
    }
  };

  const updateCatalogRate = async (code: string, series: Series, price: number | null) => {
    try {
      const prod = catalog.find((i) => i.code === code);
      if (prod) {
        const pList = await apiClient.products.getProducts({ search: code });
        const existing = pList.find((p) => p.code === code);
        if (existing) {
          const sList = await apiClient.products.getSeries();
          const targetS = sList.find((s) => s.name === series);
          if (targetS && targetS.colors.length) {
            await apiClient.products.updateProduct(existing.id, {
              rates: targetS.colors.map((c) => ({
                seriesId: targetS.id,
                colorId: c.id,
                price,
              })),
            });
          }
        }
      }
    } catch (e) {
      console.warn('API update failed, saving locally');
    }
    setCatalog((prev) =>
      prev.map((item) => {
        if (item.code !== code) return item;
        return {
          ...item,
          prices: { ...item.prices, [series]: price },
        };
      })
    );
    addToast('Rate updated', 'good');
  };

  const addCatalogItem = async (item: CatalogItem) => {
    try {
      const sList = await apiClient.products.getSeries();
      const ratesList: { seriesId: string; colorId: string; price: number | null }[] = [];
      sList.forEach((s) => {
        s.colors.forEach((c) => {
          const price = item.prices[s.name] ?? null;
          ratesList.push({ seriesId: s.id, colorId: c.id, price });
        });
      });
      await apiClient.products.createProduct({
        code: item.code,
        name: item.name,
        pcsBox: item.pcsBox,
        rates: ratesList,
      });
    } catch (e) {
      console.warn('API add failed, saving locally');
    }
    setCatalog((prev) => [...prev, item]);
    addToast('Item added', 'good');
  };

  const removeCatalogItem = async (index: number) => {
    const itemToRemove = catalog[index];
    if (itemToRemove) {
      try {
        const pList = await apiClient.products.getProducts({ search: itemToRemove.code });
        const existing = pList.find((p) => p.code === itemToRemove.code);
        if (existing) {
          await apiClient.products.deleteProduct(existing.id);
        }
      } catch (e) {
        console.warn('API remove failed, saving locally');
      }
    }
    setCatalog((prev) => prev.filter((_, idx) => idx !== index));
    addToast('Item removed', 'bad');
  };

  const updateCustomerDiscount = async (index: number, discount: number) => {
    setCustomers((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, discount } : c))
    );
    addToast('Discount updated', 'good');
  };

  const createUserAccount = async (data: {
    username: string;
    name: string;
    password?: string;
    role: Role;
    phone?: string;
    area?: string;
    discount?: number;
  }) => {
    try {
      const newUser = await apiClient.admin.createUser(data);
      setUsersList((prev) => [...prev, newUser]);
      await refreshData();
      addToast(`User ${data.username} created successfully`, 'good');
    } catch (e: any) {
      const fallbackUser: UserAccount = {
        id: uid('u_'),
        username: data.username,
        name: data.name,
        role: data.role,
        customerPhone: data.phone,
        customerArea: data.area,
        customerDiscount: data.discount,
        createdAt: Date.now(),
      };
      setUsersList((prev) => [...prev, fallbackUser]);
      if (data.role === 'customer') {
        const newCust: Customer = {
          id: fallbackUser.id,
          username: data.username,
          name: data.name,
          phone: data.phone || '',
          area: data.area || 'General',
          discount: data.discount || 0,
          balance: 0,
        };
        setCustomers((prev) => [...prev, newCust]);
      }
      addToast(`User ${data.username} created (local state)`, 'good');
    }
  };

  const updateUserAccount = async (
    id: string,
    data: {
      username?: string;
      name?: string;
      password?: string;
      role?: Role;
      phone?: string;
      area?: string;
      discount?: number;
    }
  ) => {
    try {
      const updated = await apiClient.admin.updateUser(id, data);
      setUsersList((prev) => prev.map((u) => (u.id === id ? updated : u)));
      await refreshData();
      addToast('User updated successfully', 'good');
    } catch (e: any) {
      setUsersList((prev) =>
        prev.map((u) => {
          if (u.id !== id) return u;
          return {
            ...u,
            username: data.username || u.username,
            name: data.name || u.name,
            role: data.role || u.role,
            customerArea: data.area !== undefined ? data.area : u.customerArea,
            customerDiscount: data.discount !== undefined ? data.discount : u.customerDiscount,
          };
        })
      );
      addToast('User updated (local state)', 'good');
    }
  };

  const deleteUserAccount = async (id: string) => {
    try {
      await apiClient.admin.deleteUser(id);
      setUsersList((prev) => prev.filter((u) => u.id !== id));
      addToast('User account deleted', 'bad');
    } catch (e: any) {
      setUsersList((prev) => prev.filter((u) => u.id !== id));
      addToast('User account deleted (local state)', 'bad');
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        catalog,
        customers,
        orders,
        payments,
        usersList,
        cart,
        isCartOpen,
        activePage,
        toasts,
        login,
        logout,
        setActivePage,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        placeOrder,
        setOrderStatus,
        modifyOrderItems,
        dispatchOrder,
        logPayment,
        updatePayment,
        updateCatalogRate,
        addCatalogItem,
        removeCatalogItem,
        updateCustomerDiscount,
        fetchUsersList,
        createUserAccount,
        updateUserAccount,
        deleteUserAccount,
        addToast,
        custById,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
