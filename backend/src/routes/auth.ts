import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken, AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/login - Role-autodetect authentication
router.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    const uname = (username || '').trim().toLowerCase();
    const passStr = (password || '').trim();
    if (!uname || !passStr) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // 1. Look up user account in database
    const user = await prisma.user.findUnique({
      where: { username: uname },
      include: { customer: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // 2. Validate password against bcrypt hash
    let isMatch = false;
    if (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(passStr, user.passwordHash);
    } else {
      // Legacy fallback check if password was unhashed in dev
      isMatch = user.passwordHash === passStr;
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // 3. Construct JWT payload with auto-detected role
    const roleString = user.role.toLowerCase() as 'admin' | 'customer' | 'manager' | 'store';
    const customerId = user.customerId || (user.customer ? user.customer.id : undefined);

    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      customerId,
    };

    const token = generateToken(payload);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: roleString,
        customerId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  return res.json({ user: req.user });
});

export default router;
