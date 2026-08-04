import { Order, Series } from '../types';
import { fmt, orderTotal, SERIES_LABEL } from './formatters';
import logoBlackImg from '../assets/LogoBlack.png';

export function printOrderInvoice(order: Order): void {
  const t = orderTotal(order);
  const w = window.open('', '_blank');
  if (!w) return;

  w.document.write(`<html><head><title>Invoice #${order.id.slice(-6).toUpperCase()}</title><style>
    body{font-family:Arial,sans-serif;padding:36px;color:#0F1B33;background:#fff}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #0B1B42;margin-bottom:20px}
    .brand img{height:104px;max-width:440px;object-fit:contain;display:block;margin-bottom:8px;background:transparent}
    .brand-sub{font-weight:700;color:#2F6FED;font-size:13px;margin-bottom:2px}
    .brand-addr{font-size:11.5px;color:#5A6786}
    .title-box{text-align:right}
    .title-box .inv-title{font-size:22px;font-weight:800;color:#0B1B42;letter-spacing:1px}
    .title-box .inv-id{font-size:13px;font-weight:700;color:#5A6786;margin-top:4px}
    .title-box .inv-date{font-size:12px;color:#5A6786;margin-top:2px}
    .cust-info{background:#F8FAFC;border:1px solid #E4E9F2;padding:12px 14px;border-radius:6px;margin-bottom:20px;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:16px} th,td{padding:9px 10px;border-bottom:1px solid #E4E9F2;text-align:left;font-size:13px}
    th{background:#F8FAFC;font-weight:bold;color:#0B1B42}
    .tot{font-weight:bold;font-size:16px;background:#F8FAFC}
  </style></head><body>
  <div class="header">
    <div class="brand">
      <img src="${logoBlackImg}" alt="MESCO Logo" />
      <div class="brand-sub">Mughal Electrical And Screw Company</div>
      <div class="brand-addr">Iqbal Colony, 29 Block Urban Area Sargodha, 40100 · Phone: (048) 3716807</div>
    </div>
    <div class="title-box">
      <div class="inv-title">INVOICE</div>
      <div class="inv-id">#${order.id.slice(-6).toUpperCase()}</div>
      <div class="inv-date">Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
    </div>
  </div>
  <div class="cust-info">
    <b>Customer:</b> ${order.customerName}
  </div>
  <table><thead><tr><th>Item</th><th>Series</th><th>Color</th><th style="text-align:right">Qty (pcs)</th><th style="text-align:right">Price</th><th style="text-align:right">Line Total</th></tr></thead><tbody>
  ${order.items.map(i => `<tr><td><b>${i.name}</b></td><td>${SERIES_LABEL[i.series as Series] || i.series}</td><td>${i.color || 'Standard'}</td><td style="text-align:right">${i.qty} pcs</td><td style="text-align:right">${fmt(i.price)}</td><td style="text-align:right;font-weight:700">${fmt((i.price || 0) * i.qty)}</td></tr>`).join('')}
  </tbody></table>
  <table style="margin-top:20px;width:320px;margin-left:auto">
  <tr><td>Subtotal</td><td style="text-align:right">${fmt(t.sub)}</td></tr>
  <tr><td>Discount (${order.discount || 0}%)</td><td style="text-align:right">-${fmt(t.disc)}</td></tr>
  <tr class="tot"><td>Grand Total</td><td style="text-align:right;color:#0B1B42">${fmt(t.total)}</td></tr>
  </table>
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
    body{font-family:Arial,sans-serif;padding:36px;color:#0F1B33;background:#fff}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #0B1B42;margin-bottom:20px}
    .brand img{height:104px;max-width:440px;object-fit:contain;display:block;margin-bottom:8px;background:transparent}
    .brand-sub{font-weight:700;color:#2F6FED;font-size:13px;margin-bottom:2px}
    .brand-addr{font-size:11.5px;color:#5A6786}
    .title-box{text-align:right}
    .title-box .slip-title{font-size:20px;font-weight:800;color:#0B1B42;letter-spacing:0.5px}
    .title-box .slip-id{font-size:13px;font-weight:700;color:#5A6786;margin-top:4px}
    .title-box .slip-date{font-size:12px;color:#5A6786;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-top:16px} th,td{padding:10px 8px;border-bottom:1px solid #E4E9F2;text-align:left;font-size:13px}
    th{background:#F8FAFC;font-weight:bold;color:#0B1B42}
    .info{background:#F8FAFC;border:1px solid #E4E9F2;padding:12px 14px;border-radius:6px;margin-bottom:16px;font-size:13px}
  </style></head><body>
  <div class="header">
    <div class="brand">
      <img src="${logoBlackImg}" alt="MESCO Logo" />
      <div class="brand-sub">Mughal Electrical And Screw Company</div>
      <div class="brand-addr">Iqbal Colony, 29 Block Urban Area Sargodha, 40100 · Phone: (048) 3716807</div>
    </div>
    <div class="title-box">
      <div class="slip-title">PACKING SLIP</div>
      <div class="slip-id">Order #${order.id.slice(-6).toUpperCase()}</div>
      <div class="slip-date">Date: ${new Date(order.createdAt).toLocaleDateString()}</div>
    </div>
  </div>
  <div class="info">
    <div><b>Customer:</b> ${order.customerName}${phoneStr}${cityStr}${areaStr}</div>
    ${addrStr}
  </div>
  <table><thead><tr><th>#</th><th>Item Name</th><th>Item Code</th><th>Series</th><th>Color</th><th style="text-align:right">Quantity (Pcs)</th></tr></thead><tbody>
  ${order.items.map((i, idx) => `<tr><td>${idx + 1}</td><td><b>${i.name}</b></td><td>${i.code}</td><td>${SERIES_LABEL[i.series as Series] || i.series}</td><td>${i.color || 'Standard'}</td><td style="text-align:right"><b>${i.qty} pcs</b></td></tr>`).join('')}
  </tbody></table>
  </body></html>`);
  w.document.close();
  w.print();
}
