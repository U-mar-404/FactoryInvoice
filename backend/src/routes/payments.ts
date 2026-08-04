import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/payments with search, area, and month filtering
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, customerId } = req.user!;
    const { search, area, month } = req.query;

    const where: any = {};

    if (role === Role.CUSTOMER) {
      where.customerId = customerId;
    }

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
          where.date = { gte: startDate, lte: endDate };
        }
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { note: { contains: term, mode: 'insensitive' } },
          { customer: { name: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { customer: true },
      orderBy: { date: 'desc' },
    });

    return res.json(
      payments.map((p) => ({
        id: p.id,
        customerId: p.customerId,
        amount: p.amount,
        note: p.note || '—',
        date: new Date(p.date).getTime(),
      }))
    );
  } catch (error) {
    console.error('Fetch payments error:', error);
    return res.status(500).json({ message: 'Error fetching payments' });
  }
});

// POST /api/payments - Log customer payment (Manager only)
router.post('/', authenticateToken, requireRole([Role.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, amount, note } = req.body;

    const amt = parseInt(amount, 10);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return res.status(404).json({ message: 'Customer account not found' });

    let newPayment: any;

    await prisma.$transaction(async (tx) => {
      newPayment = await tx.payment.create({
        data: {
          customerId: customer.id,
          amount: amt,
          note,
        },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          balance: { decrement: amt },
        },
      });
    });

    return res.status(201).json({
      id: newPayment.id,
      customerId: newPayment.customerId,
      amount: newPayment.amount,
      note: newPayment.note || '—',
      date: new Date(newPayment.date).getTime(),
    });
  } catch (error) {
    console.error('Log payment error:', error);
    return res.status(500).json({ message: 'Error logging payment' });
  }
});

// PUT /api/payments/:id - Edit customer payment & recalculate balance in transaction (Manager only)
router.put('/:id', authenticateToken, requireRole([Role.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;

    const amt = parseInt(amount, 10);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    const existingPayment = await prisma.payment.findUnique({ where: { id } });
    if (!existingPayment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    const oldAmount = existingPayment.amount;
    const diff = oldAmount - amt;

    let updatedPayment: any;
    await prisma.$transaction(async (tx) => {
      updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          amount: amt,
          note: note !== undefined ? note : existingPayment.note,
        },
      });

      await tx.customer.update({
        where: { id: existingPayment.customerId },
        data: {
          balance: { increment: diff },
        },
      });
    });

    return res.json({
      id: updatedPayment.id,
      customerId: updatedPayment.customerId,
      amount: updatedPayment.amount,
      note: updatedPayment.note || '—',
      date: new Date(updatedPayment.date).getTime(),
    });
  } catch (error) {
    console.error('Update payment error:', error);
    return res.status(500).json({ message: 'Error updating payment' });
  }
});

export default router;
