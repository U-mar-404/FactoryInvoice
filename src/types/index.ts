export type Role = 'admin' | 'customer' | 'manager' | 'store';

export type Series = string;

export interface Agent {
  id: string;
  name: string;
  contact?: string | null;
  customerCount?: number;
  createdAt?: string;
}

export interface ColorItem {
  id: string;
  seriesId: string;
  name: string;
  isActive: boolean;
}

export interface SeriesItem {
  id: string;
  name: string;
  isActive: boolean;
  colors: ColorItem[];
}

export interface SKUItem {
  id: string;
  seriesId: string;
  seriesName: string;
  colorId: string;
  colorName: string;
  currentPrice: number | null;
  stock: number;
  isActive: boolean;
}

export interface ProductItem {
  id: string;
  code: string;
  name: string;
  pcsBox: number;
  imageUrl?: string | null;
  isActive: boolean;
  skus: SKUItem[];
}

export interface User {
  role: Role;
  id: string;
  name: string;
  username?: string;
  customerId?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: Role;
  customerId?: string;
  customerPhone?: string;
  customerArea?: string;
  customerCity?: string;
  customerAddress?: string;
  customerDiscount?: number;
  createdAt?: number;
}

export interface SeriesPrices {
  [seriesName: string]: number | null;
}

export interface CatalogItem {
  id?: string;
  code: string;
  name: string;
  pcsBox: number;
  imageUrl?: string | null;
  prices: SeriesPrices;
  colorsBySeries?: Record<string, { id: string; name: string; price: number | null }[]>;
  skus?: { id: string; seriesName: string; colorName: string; price: number | null }[];
  stock: number;
}

export interface CustomerSeriesDiscount {
  seriesId: string;
  seriesName: string;
  discountPercent: number;
}

export interface Customer {
  id: string;
  username: string;
  name: string;
  phone: string;
  area: string;
  city?: string;
  address?: string;
  discount?: number;
  balance: number;
  agentId?: string | null;
  agentName?: string | null;
  agent?: Agent | null;
  seriesDiscounts?: CustomerSeriesDiscount[];
}

export interface OrderItem {
  code: string;
  name: string;
  series: string;
  color?: string;
  price: number;
  qty: number;
  discountPercent?: number;
}

export type OrderStatus = 'pending' | 'approved' | 'dispatched' | 'denied';

export interface OrderHistoryItem {
  s: string;
  t: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerArea?: string;
  customerCity?: string;
  customerAddress?: string;
  discount: number;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: number;
  history: OrderHistoryItem[];
}

export interface Payment {
  id: string;
  customerId: string;
  amount: number;
  note?: string;
  date: number;
}

export interface CartItem {
  code: string;
  name: string;
  series: string;
  color?: string;
  price: number;
  qty: number;
}

export interface ToastItem {
  id: string;
  msg: string;
  kind?: 'good' | 'bad';
}

export interface StockItem {
  id: string;
  itemTypeId: string;
  seriesId: string;
  colorId: string;
  code: string;
  name: string;
  seriesName: string;
  colorName: string;
  pcsBox: number;
  currentPrice: number | null;
  stockQty: number;
  minStockLevel: number;
  isLowStock: boolean;
}

export interface StockReceiptItem {
  id: string;
  skuId: string;
  code: string;
  name: string;
  seriesName: string;
  colorName: string;
  qty: number;
  addedByName: string;
  note?: string | null;
  createdAt: string;
}

export type WhatsAppConnectionStatus = 'disconnected' | 'awaiting_qr' | 'connected';

export interface WhatsAppStatusResponse {
  status: WhatsAppConnectionStatus;
  phone: string | null;
  qrCodeDataUrl: string | null;
}

export interface WhatsAppSettings {
  id: string;
  dispatchMessageTemplate: string;
  updatedAt?: string;
}

export type WhatsAppLogStatus = 'SENT' | 'FAILED' | 'SKIPPED_NO_PHONE';

export interface WhatsAppLogItem {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  message: string;
  status: WhatsAppLogStatus;
  hasPdf?: boolean;
  pdfStatus?: WhatsAppLogStatus;
  error?: string | null;
  createdAt: string;
}
