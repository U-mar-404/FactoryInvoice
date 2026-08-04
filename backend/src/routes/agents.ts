import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/agents - List all agents (Manager & Admin)
router.get('/', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        _count: {
          select: { customers: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = agents.map((a) => ({
      id: a.id,
      name: a.name,
      contact: a.contact,
      customerCount: a._count.customers,
      createdAt: a.createdAt,
    }));

    return res.json(result);
  } catch (error) {
    console.error('Fetch agents error:', error);
    return res.status(500).json({ message: 'Error fetching agents' });
  }
});

// POST /api/agents - Create agent (Manager & Admin)
router.post('/', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, contact } = req.body;
    const trimmedName = (name || '').trim();

    if (!trimmedName) {
      return res.status(400).json({ message: 'Agent name is required' });
    }

    const agent = await prisma.agent.create({
      data: {
        name: trimmedName,
        contact: (contact || '').trim() || null,
      },
    });

    return res.status(201).json(agent);
  } catch (error) {
    console.error('Create agent error:', error);
    return res.status(500).json({ message: 'Error creating agent' });
  }
});

// PUT /api/agents/:id - Update agent (Manager & Admin)
router.put('/:id', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contact } = req.body;
    const trimmedName = (name || '').trim();

    if (!trimmedName) {
      return res.status(400).json({ message: 'Agent name is required' });
    }

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        name: trimmedName,
        contact: (contact || '').trim() || null,
      },
    });

    return res.json(agent);
  } catch (error) {
    console.error('Update agent error:', error);
    return res.status(500).json({ message: 'Error updating agent' });
  }
});

// DELETE /api/agents/:id - Delete agent (Manager & Admin)
router.delete('/:id', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Unassign agent from customers before deletion
    await prisma.customer.updateMany({
      where: { agentId: id },
      data: { agentId: null },
    });

    await prisma.agent.delete({
      where: { id },
    });

    return res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Delete agent error:', error);
    return res.status(500).json({ message: 'Error deleting agent' });
  }
});

export default router;
