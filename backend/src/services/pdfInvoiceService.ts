import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

export interface InvoiceOrderItem {
  itemName?: string;
  name?: string;
  seriesName?: string;
  series?: string;
  colorName?: string;
  color?: string;
  price: number;
  qty: number;
  discountPercent?: number;
}

export interface InvoiceOrderData {
  id: string;
  createdAt: Date | string | number;
  items: InvoiceOrderItem[];
  customer: {
    name: string;
    phone?: string;
    area?: string;
    city?: string;
    address?: string;
  };
  totalAmount?: number;
}

export async function generateInvoicePdfBuffer(order: InvoiceOrderData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const navy = '#0B1B42';
      const blue = '#2F6FED';
      const grayDim = '#64748B';
      const lineGray = '#E2E8F0';
      const bgSubtle = '#F8FAFC';

      // 1. Header Banner (Height 85px with 14px internal right padding)
      doc.rect(36, 36, 523, 85).fill(navy);

      const logoPath = path.resolve(process.cwd(), 'assets', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 48, 42, { height: 36 });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#E2E8F0').text('Mughal Electrical And Screw Company', 48, 82);
        doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text('Iqbal Colony, 29 Block Urban Area Sargodha, 40100  |  Phone: (048) 3716807', 48, 95);
      } else {
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text('MESCO', 48, 42);
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#E2E8F0').text('Mughal Electrical And Screw Company', 48, 66);
        doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text('Iqbal Colony, 29 Block Urban Area Sargodha, 40100  |  Phone: (048) 3716807', 48, 82);
      }

      // Right-aligned Invoice Title & Order ID (bounded within x: 360, width: 185 -> right edge: 545, leaving 14px right margin)
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#FFFFFF').text('INVOICE', 360, 46, { align: 'right', width: 185 });
      doc.font('Helvetica').fontSize(9).fillColor('#CBD5E1').text(`#${order.id.slice(0, 8).toUpperCase()}`, 360, 70, { align: 'right', width: 185 });

      // 2. Customer & Invoice Info Meta Block
      let y = 135;
      doc.rect(36, y, 523, 58).fillAndStroke(bgSubtle, lineGray);

      const createdDate = new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      doc.font('Helvetica-Bold').fontSize(10).fillColor(navy);
      doc.text('CUSTOMER DETAILS', 50, y + 8);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#334155');
      doc.text(order.customer.name || 'Customer', 50, y + 22);

      const locationStr = [order.customer.area, order.customer.city].filter(Boolean).join(', ');
      const details = [
        order.customer.phone ? `Phone: ${order.customer.phone}` : '',
        locationStr ? `Location: ${locationStr}` : '',
      ].filter(Boolean).join('  |  ');

      if (details) {
        doc.font('Helvetica').fontSize(8.5).fillColor(grayDim).text(details, 50, y + 34);
      }

      if (order.customer.address) {
        doc.font('Helvetica').fontSize(8).fillColor(grayDim).text(`Address: ${order.customer.address}`, 50, y + 45, { width: 320 });
      }

      doc.font('Helvetica-Bold').fontSize(10).fillColor(navy).text('INVOICE DATE', 360, y + 8, { align: 'right', width: 185 });
      doc.font('Helvetica').fontSize(10).fillColor('#334155').text(createdDate, 360, y + 24, { align: 'right', width: 185 });

      // 3. Line Items Table Header
      y = 205;
      doc.rect(36, y, 523, 24).fill(navy);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF');
      doc.text('#', 44, y + 7, { width: 20 });
      doc.text('ITEM DESCRIPTION', 70, y + 7, { width: 180 });
      doc.text('SERIES / COLOR', 250, y + 7, { width: 100 });
      doc.text('QTY', 350, y + 7, { width: 35, align: 'right' });
      doc.text('RATE', 390, y + 7, { width: 50, align: 'right' });
      doc.text('DISC', 445, y + 7, { width: 40, align: 'right' });
      doc.text('AMOUNT', 490, y + 7, { width: 60, align: 'right' });

      y += 24;

      // Group items by series
      let subtotal = 0;
      let totalDiscount = 0;
      let grandTotal = 0;

      order.items.forEach((item, idx) => {
        const itemName = item.itemName || item.name || 'Item';
        const seriesName = item.seriesName || item.series || 'General';
        const colorName = item.colorName || item.color || '';
        const seriesColor = colorName ? `${seriesName} (${colorName})` : seriesName;

        const rate = item.price || 0;
        const qty = item.qty || 0;
        const disc = item.discountPercent || 0;

        const lineRaw = rate * qty;
        const lineDiscVal = lineRaw * (disc / 100);
        const lineNet = Math.round(lineRaw - lineDiscVal);

        subtotal += lineRaw;
        totalDiscount += lineDiscVal;
        grandTotal += lineNet;

        // Draw alternating row background
        if (idx % 2 === 1) {
          doc.rect(36, y, 523, 22).fill(bgSubtle);
        }

        doc.font('Helvetica').fontSize(9).fillColor('#1E293B');
        doc.text(String(idx + 1), 44, y + 6, { width: 20 });
        doc.font('Helvetica-Bold').text(itemName, 70, y + 6, { width: 175 });
        doc.font('Helvetica').fillColor(grayDim).text(seriesColor, 250, y + 6, { width: 95 });
        doc.font('Helvetica-Bold').fillColor(navy).text(`${qty} pcs`, 350, y + 6, { width: 35, align: 'right' });
        doc.font('Helvetica').fillColor('#334155').text(`Rs ${rate}`, 390, y + 6, { width: 50, align: 'right' });
        doc.font('Helvetica').fillColor(disc > 0 ? blue : grayDim).text(`${disc}%`, 445, y + 6, { width: 40, align: 'right' });
        doc.font('Helvetica-Bold').fillColor(navy).text(`Rs ${lineNet.toLocaleString()}`, 490, y + 6, { width: 60, align: 'right' });

        y += 22;

        // Page break safety check
        if (y > 720) {
          doc.addPage();
          y = 40;
        }
      });

      // 4. Totals Summary Box
      y += 10;
      doc.moveTo(36, y).lineTo(559, y).strokeColor(lineGray).stroke();
      y += 12;

      const summaryX = 330;
      const valX = 450;
      const widthVal = 95;

      doc.font('Helvetica').fontSize(9.5).fillColor(grayDim);
      doc.text('Subtotal (Pre-discount):', summaryX, y);
      doc.text(`Rs ${subtotal.toLocaleString()}`, valX, y, { align: 'right', width: widthVal });

      y += 16;
      doc.text('Total Series Savings:', summaryX, y);
      doc.fillColor(blue).text(`- Rs ${Math.round(totalDiscount).toLocaleString()}`, valX, y, { align: 'right', width: widthVal });

      y += 20;
      doc.rect(summaryX - 10, y - 4, 239, 28).fill(navy);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF');
      doc.text('GRAND TOTAL:', summaryX, y + 3);
      doc.fontSize(12).text(`Rs ${grandTotal.toLocaleString()}`, valX - 10, y + 2, { align: 'right', width: widthVal + 10 });

      // 5. Footer Notes
      y += 45;
      doc.moveTo(36, y).lineTo(559, y).strokeColor(lineGray).stroke();
      y += 10;

      doc.font('Helvetica-Bold').fontSize(9).fillColor(navy).text('MESCO — Mughal Electrical And Screw Company', 36, y, { align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor(grayDim).text('Iqbal Colony, 29 Block Urban Area Sargodha, 40100  |  Phone: (048) 3716807', 36, y + 13, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
