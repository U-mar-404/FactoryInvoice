import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/catalog - Get full catalog with dynamic series, colors, and SKU prices
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, series: seriesFilter, color: colorFilter } = req.query;

    const where: any = { isActive: true };

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
      ];
    }

    const itemTypes = await prisma.itemType.findMany({
      where,
      include: {
        skus: {
          where: { isActive: true },
          include: {
            series: true,
            color: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    let catalog = itemTypes.map((item) => {
      const prices: Record<string, number | null> = {};
      const colorsBySeries: Record<string, { id: string; name: string; price: number | null }[]> = {};

      item.skus.forEach((sku) => {
        if (sku.series && sku.color && sku.series.isActive && sku.color.isActive) {
          const sName = sku.series.name;
          if (!colorsBySeries[sName]) colorsBySeries[sName] = [];
          colorsBySeries[sName].push({
            id: sku.color.id,
            name: sku.color.name,
            price: sku.currentPrice,
          });

          // Set default series price to first available color price
          if (prices[sName] === undefined || prices[sName] === null) {
            prices[sName] = sku.currentPrice;
          }
        }
      });

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        pcsBox: item.pcsBox,
        imageUrl: item.imageUrl || null,
        prices,
        colorsBySeries,
        skus: item.skus.map((s) => ({
          id: s.id,
          seriesName: s.series.name,
          colorName: s.color.name,
          price: s.currentPrice,
        })),
        stock: 120,
      };
    });

    if (seriesFilter && typeof seriesFilter === 'string' && seriesFilter !== 'all') {
      catalog = catalog.filter((item) => item.prices[seriesFilter] !== undefined);
    }

    return res.json(catalog);
  } catch (error) {
    console.error('Catalog fetch error:', error);
    return res.status(500).json({ message: 'Error fetching catalog' });
  }
});

export default router;
