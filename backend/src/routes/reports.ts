import { Router, Response } from 'express';
import { PrismaClient, OrderStatus, Role } from '@prisma/client';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/reports with month and area query filtering
router.get('/', authenticateToken, requireRole([Role.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { month, area, search } = req.query;

    const where: any = { status: OrderStatus.DISPATCHED };

    if (area && typeof area === 'string' && area !== 'all') {
      where.customer = { area: { equals: area, mode: 'insensitive' } };
    }

    if (month && typeof month === 'string' && month !== 'all') {
      const parts = month.split('-');
      if (parts.length === 2) {
        const year = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(year) && !isNaN(m)) {
          const startDate = new Date(year, m - 1, 1);
          const endDate = new Date(year, m, 0, 23, 59, 59, 999);
          where.createdAt = { gte: startDate, lte: endDate };
        }
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { customer: { name: { contains: term, mode: 'insensitive' } } },
          { customer: { area: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    const dispatchedOrders = await prisma.order.findMany({
      where,
      include: { customer: true, items: true },
    });

    const customers = await prisma.customer.findMany();
    const paymentsCount = await prisma.payment.count();

    const byCust: Record<string, number> = {};
    const byArea: Record<string, number> = {};
    let totalSales = 0;

    dispatchedOrders.forEach((o) => {
      const subtotal = o.items.reduce((s, i) => s + i.price * i.qty, 0);
      const disc = subtotal * (o.discount / 100);
      const total = o.totalAmount > 0 ? o.totalAmount : Math.round(subtotal - disc);

      totalSales += total;

      const cName = o.customer ? o.customer.name : 'Unknown';
      const cArea = o.customer ? o.customer.area : 'Unspecified';

      byCust[cName] = (byCust[cName] || 0) + total;
      byArea[cArea] = (byArea[cArea] || 0) + total;
    });

    const totalReceivables = customers.reduce((sum, c) => sum + c.balance, 0);

    return res.json({
      totalSales,
      dispatchedCount: dispatchedOrders.length,
      totalReceivables,
      paymentsCount,
      byCust,
      byArea,
    });
  } catch (error) {
    console.error('Reports error:', error);
    return res.status(500).json({ message: 'Error generating reports' });
  }
});

export default router;
