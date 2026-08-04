import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/stock - List stock per SKU (Manager only)
router.get('/', authenticateToken, requireRole([Role.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { seriesId, search } = req.query;

    const where: any = { isActive: true };
    if (seriesId && typeof seriesId === 'string') {
      where.seriesId = seriesId;
    }

    const skus = await prisma.sKU.findMany({
      where,
      include: {
        itemType: true,
        series: true,
        color: true,
      },
      orderBy: [
        { series: { name: 'asc' } },
        { itemType: { code: 'asc' } },
      ],
    });

    let results = skus.map((sku) => ({
      id: sku.id,
      itemTypeId: sku.itemTypeId,
      seriesId: sku.seriesId,
      colorId: sku.colorId,
      code: sku.itemType.code,
      name: sku.itemType.name,
      seriesName: sku.series.name,
      colorName: sku.color.name,
      pcsBox: sku.itemType.pcsBox,
      currentPrice: sku.currentPrice,
      stockQty: sku.stockQty,
      minStockLevel: sku.minStockLevel,
      isLowStock: sku.stockQty <= sku.minStockLevel,
    }));

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.seriesName.toLowerCase().includes(q) ||
          s.colorName.toLowerCase().includes(q)
      );
    }

    return res.json(results);
  } catch (error) {
    console.error('Fetch stock error:', error);
    return res.status(500).json({ message: 'Error fetching stock list' });
  }
});

// POST /api/stock/receipt - Add stock receipt (Manager and Store)
router.post('/receipt', authenticateToken, requireRole([Role.MANAGER, Role.STORE]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { skuId, qty, note } = req.body;

    if (!skuId || !qty || typeof qty !== 'number' || qty <= 0) {
      return res.status(400).json({ message: 'Valid skuId and positive quantity are required' });
    }

    const sku = await prisma.sKU.findUnique({ where: { id: skuId } });
    if (!sku) {
      return res.status(404).json({ message: 'SKU not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create StockReceipt audit entry
      const receipt = await tx.stockReceipt.create({
        data: {
          skuId,
          qty: Math.floor(qty),
          addedById: req.user!.id,
          addedByName: req.user!.name,
          note: note ? String(note).trim() : null,
        },
      });

      // 2. Increment SKU stockQty
      const updatedSku = await tx.sKU.update({
        where: { id: skuId },
        data: {
          stockQty: { increment: Math.floor(qty) },
        },
        include: {
          itemType: true,
          series: true,
          color: true,
        },
      });

      return { receipt, sku: updatedSku };
    });

    return res.status(201).json({
      receipt: result.receipt,
      sku: {
        id: result.sku.id,
        code: result.sku.itemType.code,
        name: result.sku.itemType.name,
        seriesName: result.sku.series.name,
        colorName: result.sku.color.name,
        stockQty: result.sku.stockQty,
        minStockLevel: result.sku.minStockLevel,
      },
    });
  } catch (error) {
    console.error('Add stock receipt error:', error);
    return res.status(500).json({ message: 'Error adding stock receipt' });
  }
});

// PUT /api/stock/skus/:id/min-level - Set min stock level (Manager only)
router.put('/skus/:id/min-level', authenticateToken, requireRole([Role.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { minStockLevel } = req.body;

    if (minStockLevel === undefined || typeof minStockLevel !== 'number' || minStockLevel < 0) {
      return res.status(400).json({ message: 'Valid non-negative minStockLevel is required' });
    }

    const updatedSku = await prisma.sKU.update({
      where: { id },
      data: { minStockLevel: Math.floor(minStockLevel) },
      include: {
        itemType: true,
        series: true,
        color: true,
      },
    });

    return res.json({
      id: updatedSku.id,
      code: updatedSku.itemType.code,
      name: updatedSku.itemType.name,
      seriesName: updatedSku.series.name,
      colorName: updatedSku.color.name,
      stockQty: updatedSku.stockQty,
      minStockLevel: updatedSku.minStockLevel,
    });
  } catch (error) {
    console.error('Update min stock level error:', error);
    return res.status(500).json({ message: 'Error updating min stock level' });
  }
});

// GET /api/stock/receipts - View stock receipt audit trail (Manager only)
router.get('/receipts', authenticateToken, requireRole([Role.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const receipts = await prisma.stockReceipt.findMany({
      include: {
        sku: {
          include: {
            itemType: true,
            series: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const formatted = receipts.map((r) => ({
      id: r.id,
      skuId: r.skuId,
      code: r.sku.itemType.code,
      name: r.sku.itemType.name,
      seriesName: r.sku.series.name,
      colorName: r.sku.color.name,
      qty: r.qty,
      addedByName: r.addedByName || 'Staff',
      note: r.note,
      createdAt: r.createdAt,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Fetch stock receipts error:', error);
    return res.status(500).json({ message: 'Error fetching stock receipts' });
  }
});

// GET /api/stock/low-stock - List SKUs currently at or below minStockLevel (Manager only)
router.get('/low-stock', authenticateToken, requireRole([Role.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const skus = await prisma.sKU.findMany({
      where: {
        isActive: true,
      },
      include: {
        itemType: true,
        series: true,
        color: true,
      },
      orderBy: [
        { series: { name: 'asc' } },
        { itemType: { code: 'asc' } },
      ],
    });

    const lowStockSkus = skus
      .filter((s) => s.stockQty <= s.minStockLevel)
      .map((s) => ({
        id: s.id,
        code: s.itemType.code,
        name: s.itemType.name,
        seriesId: s.seriesId,
        seriesName: s.series.name,
        colorName: s.color.name,
        stockQty: s.stockQty,
        minStockLevel: s.minStockLevel,
      }));

    return res.json(lowStockSkus);
  } catch (error) {
    console.error('Fetch low stock error:', error);
    return res.status(500).json({ message: 'Error fetching low stock items' });
  }
});

export default router;
