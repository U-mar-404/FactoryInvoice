import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^\+?[0-9]{7,15}$/.test(cleaned);
}

// GET /api/customers - Get customer list with agent and series discounts
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, area, city } = req.query;

    const where: any = {};

    if (area && typeof area === 'string' && area !== 'all') {
      where.area = { equals: area, mode: 'insensitive' };
    }

    if (city && typeof city === 'string' && city !== 'all') {
      where.city = { equals: city, mode: 'insensitive' };
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { username: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
          { area: { contains: term, mode: 'insensitive' } },
          { city: { contains: term, mode: 'insensitive' } },
          { address: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        agent: true,
        seriesDiscounts: {
          include: { series: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = customers.map((c) => ({
      id: c.id,
      username: c.username,
      name: c.name,
      phone: c.phone || '',
      area: c.area || '',
      city: c.city || '',
      address: c.address || '',
      balance: c.balance,
      agentId: c.agentId,
      agentName: c.agent ? c.agent.name : null,
      agent: c.agent ? { id: c.agent.id, name: c.agent.name, contact: c.agent.contact } : null,
      seriesDiscounts: c.seriesDiscounts.map((sd) => ({
        seriesId: sd.seriesId,
        seriesName: sd.series.name,
        discountPercent: sd.discountPercent,
      })),
      createdAt: c.createdAt,
    }));

    return res.json(result);
  } catch (error) {
    console.error('Fetch customers error:', error);
    return res.status(500).json({ message: 'Error fetching customers' });
  }
});

// GET /api/customers/:id - Customer Detail view (Manager & Admin)
router.get('/:id', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN, Role.CUSTOMER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Security check for Customer role
    if (req.user?.role === Role.CUSTOMER && req.user.customerId !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        agent: true,
        seriesDiscounts: {
          include: { series: true },
        },
        orders: {
          include: {
            items: true,
            history: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Fetch all active series to ensure every series has an entry in seriesDiscounts
    const activeSeriesList = await prisma.series.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const discountsMap = new Map<string, number>();
    customer.seriesDiscounts.forEach((sd) => {
      discountsMap.set(sd.seriesId, sd.discountPercent);
    });

    const fullSeriesDiscounts = activeSeriesList.map((s) => ({
      seriesId: s.id,
      seriesName: s.name,
      discountPercent: discountsMap.get(s.id) ?? 0,
    }));

    const result = {
      id: customer.id,
      username: customer.username,
      name: customer.name,
      phone: customer.phone || '',
      area: customer.area || '',
      city: customer.city || '',
      address: customer.address || '',
      balance: customer.balance,
      agentId: customer.agentId,
      agent: customer.agent ? { id: customer.agent.id, name: customer.agent.name, contact: customer.agent.contact } : null,
      seriesDiscounts: fullSeriesDiscounts,
      orders: customer.orders,
      payments: customer.payments,
      createdAt: customer.createdAt,
    };

    return res.json(result);
  } catch (error) {
    console.error('Fetch customer detail error:', error);
    return res.status(500).json({ message: 'Error fetching customer detail' });
  }
});

// PUT /api/customers/:id - Update customer profile & assigned agent (Manager & Admin)
router.put('/:id', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, area, city, address, agentId } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (phone !== undefined) {
      const pStr = String(phone).trim();
      if (!isValidPhone(pStr)) {
        return res.status(400).json({ message: 'Invalid phone number format. Must contain 7 to 15 digits (e.g. 0300-1234567).' });
      }
      updateData.phone = pStr;
    }
    if (area !== undefined) updateData.area = String(area).trim();
    if (city !== undefined) updateData.city = String(city).trim();
    if (address !== undefined) updateData.address = String(address).trim();
    if (agentId !== undefined) updateData.agentId = agentId || null;

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
      include: {
        agent: true,
        seriesDiscounts: { include: { series: true } },
      },
    });

    return res.json(updatedCustomer);
  } catch (error) {
    console.error('Update customer error:', error);
    return res.status(500).json({ message: 'Error updating customer' });
  }
});

// PUT /api/customers/:id/discounts - Update per-series discounts (Manager only)
router.put('/:id/discounts', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { discounts } = req.body; // discounts: [{ seriesId: string, discountPercent: number }]

    if (!Array.isArray(discounts)) {
      return res.status(400).json({ message: 'Discounts payload must be an array' });
    }

    for (const item of discounts) {
      if (!item.seriesId) continue;
      const discountVal = parseFloat(item.discountPercent);
      const safeDiscount = isNaN(discountVal) ? 0 : Math.max(0, Math.min(100, discountVal));

      await prisma.customerSeriesDiscount.upsert({
        where: {
          customerId_seriesId: {
            customerId: id,
            seriesId: item.seriesId,
          },
        },
        update: { discountPercent: safeDiscount },
        create: {
          customerId: id,
          seriesId: item.seriesId,
          discountPercent: safeDiscount,
        },
      });
    }

    const updatedDiscounts = await prisma.customerSeriesDiscount.findMany({
      where: { customerId: id },
      include: { series: true },
    });

    return res.json(
      updatedDiscounts.map((sd) => ({
        seriesId: sd.seriesId,
        seriesName: sd.series.name,
        discountPercent: sd.discountPercent,
      }))
    );
  } catch (error) {
    console.error('Update per-series discounts error:', error);
    return res.status(500).json({ message: 'Error updating per-series discounts' });
  }
});

export default router;
