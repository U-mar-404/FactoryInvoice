import { Router, Response } from 'express';
import { Role } from '@prisma/client';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { whatsappService } from '../services/whatsappService.js';

const router = Router();

// All WhatsApp management routes require MANAGER or ADMIN role
router.use(authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]));

// GET /api/whatsapp/status - Connection status & QR code Data URL
router.get('/status', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const status = whatsappService.getStatus();
    return res.json(status);
  } catch (error) {
    console.error('Get WhatsApp status error:', error);
    return res.status(500).json({ message: 'Error fetching WhatsApp status' });
  }
});

// POST /api/whatsapp/connect - Start session / generate fresh QR code
router.post('/connect', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await whatsappService.startSession();
    return res.json({ message: 'WhatsApp session started', status });
  } catch (error) {
    console.error('Connect WhatsApp error:', error);
    return res.status(500).json({ message: 'Error starting WhatsApp session' });
  }
});

// POST /api/whatsapp/disconnect - Disconnect current session & reset QR code
router.post('/disconnect', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await whatsappService.disconnectAndReset();
    return res.json({ message: 'WhatsApp session disconnected and reset', status });
  } catch (error) {
    console.error('Disconnect WhatsApp error:', error);
    return res.status(500).json({ message: 'Error disconnecting WhatsApp session' });
  }
});

// GET /api/whatsapp/settings - Get dispatch notification message template
router.get('/settings', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await whatsappService.getSettings();
    return res.json(settings);
  } catch (error) {
    console.error('Get WhatsApp settings error:', error);
    return res.status(500).json({ message: 'Error fetching WhatsApp settings' });
  }
});

// PUT /api/whatsapp/settings - Update dispatch notification message template
router.put('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dispatchMessageTemplate } = req.body;
    const updated = await whatsappService.updateSettings(dispatchMessageTemplate);
    return res.json(updated);
  } catch (error) {
    console.error('Update WhatsApp settings error:', error);
    return res.status(500).json({ message: 'Error updating WhatsApp settings' });
  }
});

// GET /api/whatsapp/logs - Get recent WhatsApp dispatch notification logs
router.get('/logs', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await whatsappService.getLogs(50);
    return res.json(logs);
  } catch (error) {
    console.error('Get WhatsApp logs error:', error);
    return res.status(500).json({ message: 'Error fetching WhatsApp logs' });
  }
});

// POST /api/whatsapp/resend/:logId - Manually retry sending dispatch notification + PDF invoice
router.post('/resend/:logId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { logId } = req.params;
    const result = await whatsappService.resendNotification(logId);
    return res.json({ message: 'Notification resend attempt completed', result });
  } catch (error: any) {
    console.error('Resend WhatsApp notification error:', error);
    return res.status(500).json({ message: error?.message || 'Error resending WhatsApp notification' });
  }
});

export default router;
