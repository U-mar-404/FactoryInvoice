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

// GET /api/admin/users - List all user accounts (Admin only)
router.get('/users', authenticateToken, requireRole([Role.ADMIN]), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'asc' },
    });

    const result = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role.toLowerCase(),
      customerId: u.customerId,
      customerPhone: u.customer ? u.customer.phone : undefined,
      customerArea: u.customer ? u.customer.area : undefined,
      customerCity: u.customer ? u.customer.city : undefined,
      customerAddress: u.customer ? u.customer.address : undefined,
      customerDiscount: u.customer ? u.customer.discount : undefined,
      createdAt: new Date(u.createdAt).getTime(),
    }));

    return res.json(result);
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
});

// POST /api/admin/users - Create new user account (Admin only)
router.post('/users', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, name, password, role, phone, area, city, address, discount } = req.body;

    const uname = (username || '').trim().toLowerCase();
    if (!uname || !name) {
      return res.status(400).json({ message: 'Username and Name are required' });
    }

    const existing = await prisma.user.findUnique({ where: { username: uname } });
    if (existing) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const targetRole = (role || 'customer').toUpperCase() as Role;
    let customerId: string | undefined = undefined;

    // If role is CUSTOMER, require and validate Phone number and create Customer record
    if (targetRole === Role.CUSTOMER) {
      const phoneStr = (phone || '').trim();
      if (!phoneStr || !isValidPhone(phoneStr)) {
        return res.status(400).json({ message: 'A valid phone number is required for customer accounts (e.g. 0300-1234567)' });
      }

      const customer = await prisma.customer.create({
        data: {
          username: uname,
          name,
          phone: phoneStr,
          area: (area || '').trim() || 'General',
          city: (city || '').trim(),
          address: (address || '').trim(),
          discount: parseFloat(discount || 0),
          balance: 0,
        },
      });
      customerId = customer.id;
    }

    const newUser = await prisma.user.create({
      data: {
        username: uname,
        name,
        passwordHash: password || 'demo123',
        role: targetRole,
        customerId,
      },
      include: { customer: true },
    });

    return res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role.toLowerCase(),
      customerId: newUser.customerId,
      customerPhone: newUser.customer ? newUser.customer.phone : undefined,
      customerArea: newUser.customer ? newUser.customer.area : undefined,
      customerDiscount: newUser.customer ? newUser.customer.discount : undefined,
      createdAt: new Date(newUser.createdAt).getTime(),
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ message: 'Error creating user' });
  }
});

// PUT /api/admin/users/:id - Edit user account & assign role (Admin only)
router.put('/users/:id', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, name, password, role, phone, area, discount } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const uname = (username || existingUser.username).trim().toLowerCase();
    const targetRole = (role ? role.toUpperCase() : existingUser.role) as Role;
    const updateData: any = {
      username: uname,
      name: name || existingUser.name,
      role: targetRole,
    };

    if (password) {
      updateData.passwordHash = password;
    }

    // Handle Customer record linking/updating if role is CUSTOMER
    if (targetRole === Role.CUSTOMER) {
      if (phone !== undefined) {
        const phoneStr = String(phone).trim();
        if (phoneStr && !isValidPhone(phoneStr)) {
          return res.status(400).json({ message: 'Invalid phone number format. Must contain 7 to 15 digits (e.g. 0300-1234567).' });
        }
      }

      if (existingUser.customer) {
        const custUpdate: any = {
          username: uname,
          name: name || existingUser.name,
          area: area !== undefined ? area : existingUser.customer.area,
          discount: discount !== undefined ? parseFloat(discount) : existingUser.customer.discount,
        };
        if (phone !== undefined) custUpdate.phone = String(phone).trim();

        await prisma.customer.update({
          where: { id: existingUser.customer.id },
          data: custUpdate,
        });
      } else {
        const phoneStr = (phone || '').trim();
        if (!phoneStr || !isValidPhone(phoneStr)) {
          return res.status(400).json({ message: 'A valid phone number is required for customer accounts (e.g. 0300-1234567)' });
        }

        const newCust = await prisma.customer.create({
          data: {
            username: uname,
            name: name || existingUser.name,
            phone: phoneStr,
            area: area || 'General',
            discount: discount !== undefined ? parseFloat(discount) : 0,
            balance: 0,
          },
        });
        updateData.customerId = newCust.id;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { customer: true },
    });

    return res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role.toLowerCase(),
      customerId: updatedUser.customerId,
      customerPhone: updatedUser.customer ? updatedUser.customer.phone : undefined,
      customerArea: updatedUser.customer ? updatedUser.customer.area : undefined,
      customerDiscount: updatedUser.customer ? updatedUser.customer.discount : undefined,
      createdAt: new Date(updatedUser.createdAt).getTime(),
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Error updating user' });
  }
});

// DELETE /api/admin/users/:id - Delete user account (Admin only)
router.delete('/users/:id', authenticateToken, requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete associated customer if exists
    if (user.customerId) {
      await prisma.customer.delete({ where: { id: user.customerId } }).catch(() => {});
    }

    await prisma.user.delete({ where: { id } });

    return res.json({ message: 'User account deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Error deleting user' });
  }
});

export default router;
