import { Agent, CatalogItem, ColorItem, Customer, Order, OrderStatus, Payment, ProductItem, Role, SeriesItem, StockItem, StockReceiptItem, User, UserAccount, WhatsAppStatusResponse, WhatsAppSettings, WhatsAppLogItem } from '../types';

export function getApiBaseUrl(): string {
  const envUrl = ((import.meta as any).env?.VITE_API_BASE_URL as string) || '';

  let targetUrl = envUrl.trim();

  if (!targetUrl) {
    targetUrl = 'http://localhost:5001/api';
  }

  // Dynamic host adaptation for LAN testing:
  // If the browser opens the app via IP (e.g. 192.168.18.108:5173), but VITE_API_BASE_URL is 'localhost:5001',
  // replace 'localhost' / '127.0.0.1' with window.location.hostname so phone API requests hit the LAN server!
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const currentHost = window.location.hostname;
    if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
        targetUrl = targetUrl.replace('localhost', currentHost).replace('127.0.0.1', currentHost);
      }
    }
  }

  return targetUrl.endsWith('/api') ? targetUrl : `${targetUrl.replace(/\/$/, '')}/api`;
}

function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

function buildQueryString(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      searchParams.append(key, String(value));
    }
  });
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const fullUrl = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: `HTTP Error ${response.status}: ${response.statusText}` }));
      const msg = errorBody.message || `HTTP ${response.status} on ${endpoint}`;
      console.error(`[API HTTP Error ${response.status}] Endpoint: ${endpoint} | URL: ${fullUrl} | Details:`, errorBody);
      throw new Error(msg);
    }

    return await response.json();
  } catch (err: any) {
    const isTypeError = err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('Failed to fetch');
    const userMessage = isTypeError
      ? `Network Error: Unable to connect to backend server at ${baseUrl}. Ensure backend is running and reachable on LAN.`
      : (err.message || 'API request failed');

    console.error(`[API Request Failure] Endpoint: ${endpoint} | Target URL: ${fullUrl} | Error:`, err);

    if (typeof window !== 'undefined' && (window as any).__onApiError) {
      (window as any).__onApiError(userMessage);
    }

    throw new Error(userMessage);
  }
}

export const apiClient = {
  auth: {
    login: async (username: string, password?: string): Promise<{ token: string; user: User }> => {
      const data = await request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setAuthToken(data.token);
      return data;
    },
    logout: () => {
      setAuthToken(null);
    },
  },
  admin: {
    getUsers: async (): Promise<UserAccount[]> => {
      return request<UserAccount[]>('/admin/users');
    },
    createUser: async (userData: {
      username: string;
      name: string;
      password?: string;
      role: Role;
      phone?: string;
      area?: string;
      city?: string;
      address?: string;
      discount?: number;
    }): Promise<UserAccount> => {
      return request<UserAccount>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    updateUser: async (
      id: string,
      userData: {
        username?: string;
        name?: string;
        password?: string;
        role?: Role;
        phone?: string;
        area?: string;
        city?: string;
        address?: string;
        discount?: number;
      }
    ): Promise<UserAccount> => {
      return request<UserAccount>(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
    },
    deleteUser: async (id: string): Promise<void> => {
      return request(`/admin/users/${id}`, {
        method: 'DELETE',
      });
    },
  },
  products: {
    getSeries: async (): Promise<SeriesItem[]> => {
      return request<SeriesItem[]>('/products/series');
    },
    createSeries: async (name: string): Promise<SeriesItem> => {
      return request<SeriesItem>('/products/series', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    },
    updateSeries: async (id: string, name: string, isActive?: boolean): Promise<SeriesItem> => {
      return request<SeriesItem>(`/products/series/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, isActive }),
      });
    },
    deleteSeries: async (id: string): Promise<{ softDeleted: boolean; message: string }> => {
      return request(`/products/series/${id}`, {
        method: 'DELETE',
      });
    },
    createColor: async (seriesId: string, name: string): Promise<ColorItem> => {
      return request<ColorItem>('/products/colors', {
        method: 'POST',
        body: JSON.stringify({ seriesId, name }),
      });
    },
    updateColor: async (id: string, name: string, isActive?: boolean): Promise<ColorItem> => {
      return request<ColorItem>(`/products/colors/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, isActive }),
      });
    },
    deleteColor: async (id: string): Promise<{ softDeleted: boolean; message: string }> => {
      return request(`/products/colors/${id}`, {
        method: 'DELETE',
      });
    },
    getProducts: async (params?: { search?: string; series?: string; color?: string }): Promise<ProductItem[]> => {
      const qs = buildQueryString(params);
      return request<ProductItem[]>(`/products${qs}`);
    },
    createProduct: async (productData: {
      code: string;
      name: string;
      pcsBox: number;
      rates: { seriesId: string; colorId: string; price: number | null }[];
    }): Promise<ProductItem> => {
      return request<ProductItem>('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
    },
    updateProduct: async (
      id: string,
      productData: {
        code?: string;
        name?: string;
        pcsBox?: number;
        isActive?: boolean;
        rates?: { seriesId: string; colorId: string; price: number | null }[];
      }
    ): Promise<ProductItem> => {
      return request<ProductItem>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
      });
    },
    deleteProduct: async (id: string): Promise<{ softDeleted: boolean; message: string }> => {
      return request(`/products/${id}`, {
        method: 'DELETE',
      });
    },
  },
  catalog: {
    getCatalog: async (params?: { search?: string; series?: string; color?: string }): Promise<CatalogItem[]> => {
      const qs = buildQueryString(params);
      return request<CatalogItem[]>(`/catalog${qs}`);
    },
  },
  orders: {
    getOrders: async (params?: { search?: string; status?: string; month?: string }): Promise<Order[]> => {
      const qs = buildQueryString(params);
      return request<Order[]>(`/orders${qs}`);
    },
    placeOrder: async (items: { code: string; series: string; color?: string; qty: number }[]): Promise<Order> => {
      return request<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
    },
    setStatus: async (orderId: string, status: OrderStatus): Promise<Order> => {
      return request<Order>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    modifyItems: async (
      orderId: string,
      qtyMap: Record<number | string, number>,
      seriesDiscounts?: Record<string, number>,
      approve?: boolean
    ): Promise<Order> => {
      return request<Order>(`/orders/${orderId}/modify`, {
        method: 'PUT',
        body: JSON.stringify({ qtyMap, seriesDiscounts, approve }),
      });
    },
    dispatch: async (orderId: string): Promise<{ order: Order; totalAddedToBalance: number; customerName: string }> => {
      return request(`/orders/${orderId}/dispatch`, {
        method: 'POST',
      });
    },
  },
  agents: {
    getAgents: async (): Promise<Agent[]> => {
      return request<Agent[]>('/agents');
    },
    createAgent: async (data: { name: string; contact?: string }): Promise<Agent> => {
      return request<Agent>('/agents', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateAgent: async (id: string, data: { name: string; contact?: string }): Promise<Agent> => {
      return request<Agent>(`/agents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    deleteAgent: async (id: string): Promise<void> => {
      return request(`/agents/${id}`, {
        method: 'DELETE',
      });
    },
  },
  customers: {
    getCustomers: async (params?: { search?: string; area?: string; city?: string }): Promise<Customer[]> => {
      const qs = buildQueryString(params);
      return request<Customer[]>(`/customers${qs}`);
    },
    getCustomerDetail: async (id: string): Promise<Customer & { orders: Order[]; payments: Payment[] }> => {
      return request(`/customers/${id}`);
    },
    updateCustomer: async (id: string, data: { name?: string; phone?: string; area?: string; city?: string; address?: string; agentId?: string | null }): Promise<Customer> => {
      return request<Customer>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    updateDiscounts: async (id: string, discounts: { seriesId: string; discountPercent: number }[]): Promise<any> => {
      return request(`/customers/${id}/discounts`, {
        method: 'PUT',
        body: JSON.stringify({ discounts }),
      });
    },
  },
  payments: {
    getPayments: async (params?: { search?: string; area?: string; month?: string }): Promise<Payment[]> => {
      const qs = buildQueryString(params);
      return request<Payment[]>(`/payments${qs}`);
    },
    logPayment: async (customerId: string, amount: number, note?: string): Promise<Payment> => {
      return request<Payment>('/payments', {
        method: 'POST',
        body: JSON.stringify({ customerId, amount, note }),
      });
    },
    updatePayment: async (id: string, amount: number, note?: string): Promise<Payment> => {
      return request<Payment>(`/payments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ amount, note }),
      });
    },
  },
  reports: {
    getReports: async (params?: { month?: string; area?: string; search?: string }): Promise<{
      totalSales: number;
      dispatchedCount: number;
      totalReceivables: number;
      paymentsCount: number;
      byCust: Record<string, number>;
      byArea: Record<string, number>;
    }> => {
      const qs = buildQueryString(params);
      return request(`/reports${qs}`);
    },
  },
  stock: {
    getStock: async (params?: { seriesId?: string; search?: string }): Promise<StockItem[]> => {
      const qs = buildQueryString(params);
      return request<StockItem[]>(`/stock${qs}`);
    },
    addReceipt: async (skuId: string, qty: number, note?: string): Promise<{ receipt: StockReceiptItem; sku: any }> => {
      return request('/stock/receipt', {
        method: 'POST',
        body: JSON.stringify({ skuId, qty, note }),
      });
    },
    updateMinLevel: async (skuId: string, minStockLevel: number): Promise<StockItem> => {
      return request<StockItem>(`/stock/skus/${skuId}/min-level`, {
        method: 'PUT',
        body: JSON.stringify({ minStockLevel }),
      });
    },
    getReceipts: async (search?: string): Promise<StockReceiptItem[]> => {
      const qs = buildQueryString({ search });
      return request<StockReceiptItem[]>(`/stock/receipts${qs}`);
    },
    getLowStock: async (): Promise<StockItem[]> => {
      return request<StockItem[]>('/stock/low-stock');
    },
  },
  whatsapp: {
    getStatus: async (): Promise<WhatsAppStatusResponse> => {
      return request<WhatsAppStatusResponse>('/whatsapp/status');
    },
    connect: async (): Promise<{ message: string; status: WhatsAppStatusResponse }> => {
      return request('/whatsapp/connect', { method: 'POST' });
    },
    disconnect: async (): Promise<{ message: string; status: WhatsAppStatusResponse }> => {
      return request('/whatsapp/disconnect', { method: 'POST' });
    },
    getSettings: async (): Promise<WhatsAppSettings> => {
      return request<WhatsAppSettings>('/whatsapp/settings');
    },
    updateSettings: async (dispatchMessageTemplate: string): Promise<WhatsAppSettings> => {
      return request<WhatsAppSettings>('/whatsapp/settings', {
        method: 'PUT',
        body: JSON.stringify({ dispatchMessageTemplate }),
      });
    },
    getLogs: async (): Promise<WhatsAppLogItem[]> => {
      return request<WhatsAppLogItem[]>('/whatsapp/logs');
    },
    resend: async (logId: string): Promise<{ message: string; result: any }> => {
      return request(`/whatsapp/resend/${logId}`, { method: 'POST' });
    },
  },
};
