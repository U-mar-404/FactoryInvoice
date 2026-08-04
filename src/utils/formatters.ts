import { Order, Series } from '../types';

export const SERIES: Series[] = ['Vector', 'Ambit', 'WavesCubic'];

export const SERIES_LABEL: Record<Series, string> = {
  Vector: 'Vector',
  Ambit: 'Ambit',
  WavesCubic: 'Waves/Cubic',
};

export const fmt = (n: number | null | undefined): string => {
  return 'Rs ' + Number(n || 0).toLocaleString();
};

export const uid = (prefix: string): string => {
  return prefix + Math.random().toString(36).slice(2, 8);
};

export interface OrderTotalResult {
  sub: number;
  disc: number;
  total: number;
}

export const orderTotal = (
  order: Pick<Order, 'items' | 'discount'> & { customerId?: string; customerName?: string },
  custLookupOrObj?: any
): OrderTotalResult => {
  let sub = 0;
  let total = 0;

  let cust: any = null;
  if (typeof custLookupOrObj === 'function') {
    cust = custLookupOrObj(order.customerId || order.customerName);
  } else if (custLookupOrObj && typeof custLookupOrObj === 'object') {
    cust = custLookupOrObj;
  }

  (order.items || []).forEach((i: any) => {
    const lineSub = i.price * i.qty;
    let itemDiscPct = i.discountPercent;

    if (itemDiscPct === undefined || itemDiscPct === null || itemDiscPct === 0) {
      if (cust && cust.seriesDiscounts && Array.isArray(cust.seriesDiscounts)) {
        const sd = cust.seriesDiscounts.find(
          (d: any) => (d.seriesName || '').toLowerCase() === (i.series || i.seriesName || '').toLowerCase()
        );
        if (sd && sd.discountPercent > 0) {
          itemDiscPct = sd.discountPercent;
        }
      }
      if (!itemDiscPct) itemDiscPct = order.discount || 0;
    }

    const priceAfterDisc = Math.round(i.price * (1 - itemDiscPct / 100));
    const lineTotal = priceAfterDisc * i.qty;
    sub += lineSub;
    total += lineTotal;
  });
  const disc = sub - total;
  return { sub, disc, total };
};
