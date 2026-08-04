import { Order, Series } from '../types';
import { fmt, orderTotal, SERIES_LABEL } from './formatters';

export function printOrderInvoice(order: Order): void {
  const t = orderTotal(order);
  const w = window.open('', '_blank');
  if (!w) return;

  w.document.write(`<html><head><title>Invoice ${order.id}</title><style>
    body{font-family:Arial,sans-serif;padding:40px;color:#0F1B33}
    h1{margin:0 0 2px;color:#0B1B42} .m{color:#5A6786;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-top:16px} th,td{padding:8px;border-bottom:1px solid #E4E9F2;text-align:left;font-size:13px}
    .tot{font-weight:bold;font-size:16px}
  </style></head><body>
  <h1>MESCO</h1>
  <div style="font-weight:700;color:#2F6FED;font-size:14px;margin-bottom:2px">Mughal Electrical And Screw Company</div>
  <div style="font-size:12px;color:#5A6786;margin-bottom:14px">Iqbal Colony, 29 Block Urban Area Sargodha, 40100 · Phone: (048) 3716807</div>
  <div class="m">Invoice for order #${order.id.slice(-6).toUpperCase()} · ${new Date(order.createdAt).toLocaleDateString()}</div>
  <div><b>Customer:</b> ${order.customerName}</div>
  <table><thead><tr><th>Item</th><th>Series</th><th>Color</th><th>Qty (pcs)</th><th>Price</th><th>Line total</th></tr></thead><tbody>
  ${order.items.map(i => `<tr><td>${i.name}</td><td>${SERIES_LABEL[i.series as Series] || i.series}</td><td>${i.color || 'Standard'}</td><td>${i.qty} pcs</td><td>${fmt(i.price)}</td><td>${fmt((i.price || 0) * i.qty)}</td></tr>`).join('')}
  </tbody></table>
  <table><tr><td>Subtotal</td><td style="text-align:right">${fmt(t.sub)}</td></tr>
  <tr><td>Discount (${order.discount || 0}%)</td><td style="text-align:right">-${fmt(t.disc)}</td></tr>
  <tr class="tot"><td>Total</td><td style="text-align:right">${fmt(t.total)}</td></tr></table>
  </body></html>`);
  w.document.close();
  w.print();
}

export function printPackingSlip(order: Order): void {
  const w = window.open('', '_blank');
  if (!w) return;

  const phoneStr = order.customerPhone ? ` · <b>Phone:</b> ${order.customerPhone}` : '';
  const cityStr = order.customerCity ? ` · <b>City:</b> ${order.customerCity}` : '';
  const areaStr = order.customerArea ? ` · <b>Area:</b> ${order.customerArea}` : '';
  const addrStr = order.customerAddress ? `<div style="margin-top:4px;color:#5A6786"><b>Delivery Address:</b> ${order.customerAddress}</div>` : '';

  w.document.write(`<html><head><title>Packing Slip - Order #${order.id.slice(-6).toUpperCase()}</title><style>
    body{font-family:Arial,sans-serif;padding:40px;color:#0F1B33}
    h1{margin:0 0 2px} .m{color:#5A6786;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-top:16px} th,td{padding:10px 8px;border-bottom:1px solid #E4E9F2;text-align:left;font-size:13px}
    th{background:#F8FAFC;font-weight:bold}
    .info{background:#F8FAFC;border:1px solid #E4E9F2;padding:12px 14px;border-radius:6px;margin-bottom:16px;font-size:13px}
  </style></head><body>
  <h1>MESCO - PACKING SLIP</h1><div class="m">Packing Slip for Order #${order.id.slice(-6).toUpperCase()} · ${new Date(order.createdAt).toLocaleDateString()}</div>
  <div class="info">
    <div><b>Customer:</b> ${order.customerName}${phoneStr}${cityStr}${areaStr}</div>
    ${addrStr}
  </div>
  <table><thead><tr><th>#</th><th>Item Name</th><th>Item Code</th><th>Series</th><th>Color</th><th>Quantity (Pcs)</th></tr></thead><tbody>
  ${order.items.map((i, idx) => `<tr><td>${idx + 1}</td><td>${i.name}</td><td>${i.code}</td><td>${SERIES_LABEL[i.series as Series] || i.series}</td><td>${i.color || 'Standard'}</td><td><b>${i.qty} pcs</b></td></tr>`).join('')}
  </tbody></table>
  </body></html>`);
  w.document.close();
  w.print();
}
