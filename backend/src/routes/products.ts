import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/products/series - Get all active series with their colors
router.get('/series', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const seriesList = await prisma.series.findMany({
      include: {
        colors: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json(
      seriesList.map((s) => ({
        id: s.id,
        name: s.name,
        isActive: s.isActive,
        colors: s.colors.map((c) => ({
          id: c.id,
          seriesId: c.seriesId,
          name: c.name,
          isActive: c.isActive,
        })),
      }))
    );
  } catch (error) {
    console.error('Fetch series error:', error);
    return res.status(500).json({ message: 'Error fetching series' });
  }
});

// POST /api/products/series - Create new Series (Manager only)
router.post('/series', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    const seriesName = (name || '').trim();

    if (!seriesName) {
      return res.status(400).json({ message: 'Series name is required' });
    }

    const series = await prisma.series.create({
      data: { name: seriesName },
      include: { colors: true },
    });

    return res.status(201).json({
      id: series.id,
      name: series.name,
      isActive: series.isActive,
      colors: [],
    });
  } catch (error: any) {
    console.error('Create series error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Series name already exists' });
    }
    return res.status(500).json({ message: 'Error creating series' });
  }
});

// PUT /api/products/series/:id - Update Series (Manager only)
router.put('/series/:id', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const series = await prisma.series.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
      include: { colors: true },
    });

    return res.json({
      id: series.id,
      name: series.name,
      isActive: series.isActive,
      colors: series.colors.map((c) => ({
        id: c.id,
        seriesId: c.seriesId,
        name: c.name,
        isActive: c.isActive,
      })),
    });
  } catch (error) {
    console.error('Update series error:', error);
    return res.status(500).json({ message: 'Error updating series' });
  }
});

// DELETE /api/products/series/:id - Deactivate / delete Series with order reference check (Manager only)
router.delete('/series/:id', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const series = await prisma.series.findUnique({
      where: { id },
      include: { skus: true },
    });

    if (!series) return res.status(404).json({ message: 'Series not found' });

    // Check if referenced in historical order items
    const orderItemsCount = await prisma.orderItem.count({
      where: { seriesName: series.name },
    });

    if (orderItemsCount > 0) {
      // Soft delete / deactivate
      await prisma.series.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        softDeleted: true,
        message: `Series "${series.name}" is referenced by ${orderItemsCount} historical order items and has been deactivated instead of hard deleted.`,
      });
    } else {
      // Hard delete if unreferenced
      await prisma.series.delete({ where: { id } });
      return res.json({
        softDeleted: false,
        message: `Series "${series.name}" deleted successfully.`,
      });
    }
  } catch (error) {
    console.error('Delete series error:', error);
    return res.status(500).json({ message: 'Error deleting series' });
  }
});

// POST /api/products/colors - Create Color for a Series (Manager only)
router.post('/colors', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { seriesId, name } = req.body;
    const colorName = (name || '').trim();

    if (!seriesId || !colorName) {
      return res.status(400).json({ message: 'Series ID and Color name are required' });
    }

    const color = await prisma.color.create({
      data: {
        seriesId,
        name: colorName,
      },
    });

    return res.status(201).json({
      id: color.id,
      seriesId: color.seriesId,
      name: color.name,
      isActive: color.isActive,
    });
  } catch (error: any) {
    console.error('Create color error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Color already exists for this series' });
    }
    return res.status(500).json({ message: 'Error creating color' });
  }
});

// PUT /api/products/colors/:id - Update Color (Manager only)
router.put('/colors/:id', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const color = await prisma.color.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return res.json({
      id: color.id,
      seriesId: color.seriesId,
      name: color.name,
      isActive: color.isActive,
    });
  } catch (error) {
    console.error('Update color error:', error);
    return res.status(500).json({ message: 'Error updating color' });
  }
});

// DELETE /api/products/colors/:id - Deactivate / delete Color with order check (Manager only)
router.delete('/colors/:id', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const color = await prisma.color.findUnique({ where: { id } });
    if (!color) return res.status(404).json({ message: 'Color not found' });

    const orderItemsCount = await prisma.orderItem.count({
      where: { colorName: color.name },
    });

    if (orderItemsCount > 0) {
      await prisma.color.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        softDeleted: true,
        message: `Color "${color.name}" is referenced by ${orderItemsCount} historical order items and has been deactivated instead of hard deleted.`,
      });
    } else {
      await prisma.color.delete({ where: { id } });
      return res.json({
        softDeleted: false,
        message: `Color "${color.name}" deleted successfully.`,
      });
    }
  } catch (error) {
    console.error('Delete color error:', error);
    return res.status(500).json({ message: 'Error deleting color' });
  }
});

// GET /api/products - Get full Products list with SKUs, series, and colors
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, series: seriesFilter, color: colorFilter } = req.query;

    const where: any = {};

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.itemType.findMany({
      where,
      include: {
        skus: {
          include: {
            series: true,
            color: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const result = products.map((p) => {
      const skus = p.skus.map((s) => ({
        id: s.id,
        seriesId: s.seriesId,
        seriesName: s.series.name,
        colorId: s.colorId,
        colorName: s.color.name,
        currentPrice: s.currentPrice,
        stock: s.stockQty,
        isActive: s.isActive && s.series.isActive && s.color.isActive,
      }));

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        pcsBox: p.pcsBox,
        isActive: p.isActive,
        skus,
      };
    });

    let filtered = result;
    if (seriesFilter && typeof seriesFilter === 'string' && seriesFilter !== 'all') {
      filtered = filtered.filter((p) => p.skus.some((s) => s.seriesName.toLowerCase() === seriesFilter.toLowerCase()));
    }
    if (colorFilter && typeof colorFilter === 'string' && colorFilter !== 'all') {
      filtered = filtered.filter((p) => p.skus.some((s) => s.colorName.toLowerCase() === colorFilter.toLowerCase()));
    }

    return res.json(filtered);
  } catch (error) {
    console.error('Fetch products error:', error);
    return res.status(500).json({ message: 'Error fetching products' });
  }
});

// POST /api/products - Create Product & SKU rates (Manager only)
router.post('/', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, name, pcsBox, rates } = req.body; // rates: [{ seriesId, colorId, price }]

    const trimmedCode = (code || '').trim();
    const trimmedName = (name || '').trim();

    if (!trimmedCode || !trimmedName) {
      return res.status(400).json({ message: 'Product Code and Name are required' });
    }

    const itemType = await prisma.itemType.create({
      data: {
        code: trimmedCode,
        name: trimmedName,
        pcsBox: parseInt(pcsBox || '10', 10),
      },
    });

    if (rates && Array.isArray(rates)) {
      for (const r of rates) {
        if (!r.seriesId || !r.colorId) continue;
        const price = r.price !== null && r.price !== '' && r.price !== undefined ? parseInt(String(r.price), 10) : null;

        // Only create SKU row if an actual price is offered for this series+color
        if (price !== null && !isNaN(price)) {
          const sku = await prisma.sKU.create({
            data: {
              itemTypeId: itemType.id,
              seriesId: r.seriesId,
              colorId: r.colorId,
              currentPrice: price,
              stockQty: 100,
            },
          });

          await prisma.priceHistory.create({
            data: { skuId: sku.id, price },
          });
        }
      }
    }

    const fullProduct = await prisma.itemType.findUnique({
      where: { id: itemType.id },
      include: {
        skus: {
          include: { series: true, color: true },
        },
      },
    });

    return res.status(201).json(fullProduct);
  } catch (error: any) {
    console.error('Create product error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Product code already exists' });
    }
    return res.status(500).json({ message: 'Error creating product' });
  }
});

// PUT /api/products/:id - Update Product & SKU rates (Manager only)
router.put('/:id', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, pcsBox, rates, isActive } = req.body;

    const itemType = await prisma.itemType.update({
      where: { id },
      data: {
        code: code !== undefined ? code.trim() : undefined,
        name: name !== undefined ? name.trim() : undefined,
        pcsBox: pcsBox !== undefined ? parseInt(pcsBox, 10) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    if (rates && Array.isArray(rates)) {
      for (const r of rates) {
        if (!r.seriesId || !r.colorId) continue;
        const price = r.price !== null && r.price !== '' && r.price !== undefined ? parseInt(String(r.price), 10) : null;

        if (price !== null && !isNaN(price)) {
          const sku = await prisma.sKU.upsert({
            where: {
              itemTypeId_seriesId_colorId: {
                itemTypeId: id,
                seriesId: r.seriesId,
                colorId: r.colorId,
              },
            },
            update: { currentPrice: price },
            create: {
              itemTypeId: id,
              seriesId: r.seriesId,
              colorId: r.colorId,
              currentPrice: price,
              stockQty: 100,
            },
          });

          await prisma.priceHistory.create({
            data: { skuId: sku.id, price },
          });
        } else {
          // If price set to null/empty, check if unreferenced SKU exists and delete it
          const existingSku = await prisma.sKU.findUnique({
            where: {
              itemTypeId_seriesId_colorId: {
                itemTypeId: id,
                seriesId: r.seriesId,
                colorId: r.colorId,
              },
            },
            include: { orderItems: true },
          });

          if (existingSku && existingSku.orderItems.length === 0) {
            await prisma.sKU.delete({ where: { id: existingSku.id } });
          } else if (existingSku) {
            await prisma.sKU.update({ where: { id: existingSku.id }, data: { currentPrice: null } });
          }
        }
      }
    }

    const fullProduct = await prisma.itemType.findUnique({
      where: { id },
      include: {
        skus: {
          include: { series: true, color: true },
        },
      },
    });

    return res.json(fullProduct);
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ message: 'Error updating product' });
  }
});

// DELETE /api/products/:id - Soft-delete / deactivate Product if referenced (Manager only)
router.delete('/:id', authenticateToken, requireRole([Role.MANAGER, Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const itemType = await prisma.itemType.findUnique({ where: { id } });
    if (!itemType) return res.status(404).json({ message: 'Product not found' });

    const orderItemsCount = await prisma.orderItem.count({
      where: { itemCode: itemType.code },
    });

    if (orderItemsCount > 0) {
      await prisma.itemType.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        softDeleted: true,
        message: `Product "${itemType.name}" (CODE ${itemType.code}) is referenced by ${orderItemsCount} historical order items and has been deactivated instead of hard deleted.`,
      });
    } else {
      await prisma.itemType.delete({ where: { id } });
      return res.json({
        softDeleted: false,
        message: `Product "${itemType.name}" deleted successfully.`,
      });
    }
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ message: 'Error deleting product' });
  }
});

export default router;
