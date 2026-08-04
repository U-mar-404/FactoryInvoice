import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { PrismaClient, WhatsAppLogStatus } from '@prisma/client';
import { generateInvoicePdfBuffer } from './pdfInvoiceService.js';

const prisma = new PrismaClient();

const AUTH_DIR = path.resolve(process.cwd(), 'baileys_auth_info');

export type ConnectionStatus = 'disconnected' | 'awaiting_qr' | 'connected';

export interface WhatsAppServiceStatus {
  status: ConnectionStatus;
  phone: string | null;
  qrCodeDataUrl: string | null;
}

const createSilentLogger = () => {
  const logFn = () => {};
  const logger: any = {
    level: 'silent',
    trace: logFn,
    debug: logFn,
    info: logFn,
    warn: logFn,
    error: logFn,
    fatal: logFn,
  };
  logger.child = () => logger;
  return logger;
};

class WhatsAppService {
  private sock: WASocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private phone: string | null = null;
  private qrCodeDataUrl: string | null = null;
  private isInitializing: boolean = false;

  constructor() {
    // Start initial connection setup
    this.init();
  }

  public getStatus(): WhatsAppServiceStatus {
    return {
      status: this.status,
      phone: this.phone,
      qrCodeDataUrl: this.qrCodeDataUrl,
    };
  }

  public async init(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] as any }));

      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: createSilentLogger(),
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr);
            this.status = 'awaiting_qr';
            this.phone = null;
            console.log(`[WhatsApp] Generated QR Code Data URL (length: ${this.qrCodeDataUrl.length})`);
          } catch (err) {
            console.error('[WhatsApp] Failed to generate QR data URL:', err);
          }
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.qrCodeDataUrl = null;
          const userJid = this.sock?.user?.id || '';
          // Extract numeric phone number from JID (e.g., 923001234567:12@s.whatsapp.net -> +923001234567)
          const numMatch = userJid.split('@')[0].split(':')[0];
          this.phone = numMatch ? `+${numMatch}` : 'Connected';
          console.log(`[WhatsApp] Connected successfully as ${this.phone}`);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log('[WhatsApp] Connection closed. StatusCode:', statusCode, 'Error:', lastDisconnect?.error?.message || lastDisconnect?.error);
          this.status = 'disconnected';
          this.phone = null;

          if (shouldReconnect) {
            console.log('[WhatsApp] Connection closed, reconnecting...');
            this.isInitializing = false;
            setTimeout(() => this.init(), 3000);
          } else {
            console.log('[WhatsApp] Logged out. Clearing session files.');
            this.qrCodeDataUrl = null;
            this.clearAuthDirectory();
            this.isInitializing = false;
          }
        }
      });
    } catch (err) {
      console.error('[WhatsApp] Initialization error:', err);
      this.status = 'disconnected';
      this.phone = null;
    } finally {
      this.isInitializing = false;
    }
  }

  public async startSession(): Promise<WhatsAppServiceStatus> {
    console.log('[WhatsApp] startSession requested by manager');
    if (this.status === 'connected') {
      return this.getStatus();
    }
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch (_) {}
      this.sock = null;
    }
    this.status = 'disconnected';
    this.phone = null;
    this.qrCodeDataUrl = null;
    this.clearAuthDirectory();
    this.isInitializing = false;
    await this.init();
    return this.getStatus();
  }

  public async disconnectAndReset(): Promise<WhatsAppServiceStatus> {
    console.log('[WhatsApp] disconnectAndReset requested by manager');
    try {
      if (this.sock) {
        try {
          await this.sock.logout();
        } catch (_) {}
        try {
          this.sock.end(undefined);
        } catch (_) {}
        this.sock = null;
      }
    } catch (err) {
      console.error('[WhatsApp] Disconnect error:', err);
    } finally {
      this.status = 'disconnected';
      this.phone = null;
      this.qrCodeDataUrl = null;
      this.clearAuthDirectory();

      // Restart initialization to emit new QR code
      setTimeout(() => this.init(), 1000);
    }

    return this.getStatus();
  }

  private clearAuthDirectory(): void {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
    } catch (e) {
      console.error('[WhatsApp] Error clearing auth dir:', e);
    }
  }

  public async getSettings() {
    let setting = await prisma.whatsAppSetting.findUnique({ where: { id: 'default' } });
    if (!setting) {
      setting = await prisma.whatsAppSetting.create({
        data: {
          id: 'default',
          dispatchMessageTemplate: 'Hi {customerName}, your order #{orderId} has been dispatched.',
        },
      });
    }
    return setting;
  }

  public async updateSettings(templateText: string) {
    const template = (templateText || '').trim() || 'Hi {customerName}, your order #{orderId} has been dispatched.';
    return prisma.whatsAppSetting.upsert({
      where: { id: 'default' },
      update: { dispatchMessageTemplate: template },
      create: { id: 'default', dispatchMessageTemplate: template },
    });
  }

  public async getLogs(limit: number = 50) {
    return prisma.whatsAppLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  public async sendDispatchNotification(params: {
    orderId: string;
    customerName: string;
    phone: string | null | undefined;
    totalAmount?: number;
  }): Promise<{ success: boolean; status: WhatsAppLogStatus; pdfStatus: WhatsAppLogStatus; error?: string }> {
    const { orderId, customerName, phone, totalAmount } = params;
    const rawPhone = (phone || '').trim();

    // Fetch full order data for customer-facing priced PDF invoice generation
    const orderData = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, items: true },
    }).catch(() => null);

    const calcTotal = orderData?.items?.length
      ? orderData.items.reduce((sum, i) => {
          const raw = i.price * i.qty;
          const disc = raw * (i.discountPercent / 100);
          return sum + Math.round(raw - disc);
        }, 0)
      : totalAmount || 0;

    const template = (await this.getSettings()).dispatchMessageTemplate;
    const formattedMessage = this.formatMessage(template, customerName, orderId, calcTotal);

    // 1. Generate Invoice PDF Buffer
    let pdfBuffer: Buffer | null = null;
    let pdfStatus: WhatsAppLogStatus = WhatsAppLogStatus.SENT;
    let pdfError: string | null = null;

    if (orderData) {
      try {
        pdfBuffer = await generateInvoicePdfBuffer(orderData);
        console.log(`[WhatsApp] Generated invoice PDF for order ${orderId} (${pdfBuffer.length} bytes)`);
      } catch (err: any) {
        console.error(`[WhatsApp] PDF invoice generation error for order ${orderId}:`, err);
        pdfStatus = WhatsAppLogStatus.FAILED;
        pdfError = err?.message || 'PDF Generation Error';
      }
    } else {
      pdfStatus = WhatsAppLogStatus.FAILED;
      pdfError = 'Order data not found for PDF generation';
    }

    // 2. Check if phone number is provided
    if (!rawPhone) {
      await prisma.whatsAppLog.create({
        data: {
          orderId,
          customerName,
          phone: '—',
          message: formattedMessage,
          status: WhatsAppLogStatus.SKIPPED_NO_PHONE,
          hasPdf: true,
          pdfStatus: WhatsAppLogStatus.SKIPPED_NO_PHONE,
          error: 'Customer has no phone number on record',
        },
      });
      return { success: false, status: WhatsAppLogStatus.SKIPPED_NO_PHONE, pdfStatus: WhatsAppLogStatus.SKIPPED_NO_PHONE, error: 'No phone number' };
    }

    // Format target phone number into international WhatsApp JID (e.g. 03001234567 -> 923001234567@s.whatsapp.net)
    let cleaned = rawPhone.replace(/[\s\-\(\)\+]/g, '');
    if (cleaned.startsWith('03')) {
      cleaned = '92' + cleaned.substring(1);
    } else if (cleaned.startsWith('3')) {
      cleaned = '92' + cleaned;
    }

    const jid = `${cleaned}@s.whatsapp.net`;

    // 3. Check socket connection
    if (this.status !== 'connected' || !this.sock) {
      await prisma.whatsAppLog.create({
        data: {
          orderId,
          customerName,
          phone: rawPhone,
          message: formattedMessage,
          status: WhatsAppLogStatus.FAILED,
          hasPdf: true,
          pdfStatus: pdfStatus === WhatsAppLogStatus.SENT ? WhatsAppLogStatus.FAILED : pdfStatus,
          error: 'WhatsApp service is disconnected or awaiting QR scan',
        },
      });
      return { success: false, status: WhatsAppLogStatus.FAILED, pdfStatus: WhatsAppLogStatus.FAILED, error: 'WhatsApp disconnected' };
    }

    // 4. Send Message via Baileys (Document attachment + caption if PDF exists)
    try {
      if (pdfBuffer) {
        await this.sock.sendMessage(jid, {
          document: pdfBuffer,
          mimetype: 'application/pdf',
          fileName: `Invoice_${orderId.slice(0, 8).toUpperCase()}.pdf`,
          caption: formattedMessage,
        });
        pdfStatus = WhatsAppLogStatus.SENT;
      } else {
        await this.sock.sendMessage(jid, { text: formattedMessage });
      }

      const logRecord = await prisma.whatsAppLog.create({
        data: {
          orderId,
          customerName,
          phone: rawPhone,
          message: formattedMessage,
          status: WhatsAppLogStatus.SENT,
          hasPdf: true,
          pdfStatus,
          error: pdfError,
        },
      });

      console.log(`[WhatsApp] Sent dispatch notification + PDF invoice for order ${orderId} to ${rawPhone}`);
      return { success: true, status: WhatsAppLogStatus.SENT, pdfStatus };
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to send WhatsApp message';
      console.error(`[WhatsApp] Failed to send dispatch message for order ${orderId}:`, errMsg);

      await prisma.whatsAppLog.create({
        data: {
          orderId,
          customerName,
          phone: rawPhone,
          message: formattedMessage,
          status: WhatsAppLogStatus.FAILED,
          hasPdf: true,
          pdfStatus: WhatsAppLogStatus.FAILED,
          error: errMsg,
        },
      });

      return { success: false, status: WhatsAppLogStatus.FAILED, pdfStatus: WhatsAppLogStatus.FAILED, error: errMsg };
    }
  }

  public async resendNotification(logId: string): Promise<{ success: boolean; status: WhatsAppLogStatus; pdfStatus: WhatsAppLogStatus; error?: string }> {
    const existingLog = await prisma.whatsAppLog.findUnique({ where: { id: logId } });
    if (!existingLog) {
      throw new Error('Log entry not found');
    }

    const orderData = await prisma.order.findUnique({
      where: { id: existingLog.orderId },
      include: { customer: true, items: true },
    });

    if (!orderData) {
      throw new Error('Order not found for resending notification');
    }

    return this.sendDispatchNotification({
      orderId: orderData.id,
      customerName: orderData.customer.name,
      phone: orderData.customer.phone,
    });
  }

  private formatMessage(template: string, customerName: string, orderId: string, totalAmount?: number): string {
    const shortOrderId = orderId ? orderId.substring(0, 8) : '';
    const formattedTotal = totalAmount !== undefined ? `Rs ${totalAmount.toLocaleString()}` : '';

    return template
      .replace(/\{customerName\}/g, customerName || 'Customer')
      .replace(/\{orderId\}/g, shortOrderId)
      .replace(/\{fullOrderId\}/g, orderId)
      .replace(/\{totalAmount\}/g, formattedTotal);
  }
}

export const whatsappService = new WhatsAppService();
