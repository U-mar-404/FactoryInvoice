import { Router, Response } from 'express';
import { PrismaClient, OrderStatus, Role } from '@prisma/client';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { whatsappService } from '../services/whatsappService.js';

const router = Router();
const prisma = new PrismaClient();

function formatOrderResponse(order: any, isStore: boolean = false) {
  const customerDiscountsMap = new Map<string, number>();
  if (!isStore && order.customer && Array.isArray(order.customer.seriesDiscounts)) {
    order.customer.seriesDiscounts.forEach((sd: any) => {
      const sName = sd.series ? sd.series.name.toLowerCase() : '';
      if (sName) customerDiscountsMap.set(sName, sd.discountPercent);
    });
  }

  return {
    id: order.id,
    customerId: order.customerId,
    customerName: order.customer ? order.customer.name : '',
    customerPhone: order.customer ? order.customer.phone || '' : '',
    customerArea: order.customer ? order.customer.area || '' : '',
    customerCity: order.customer ? order.customer.city || '' : '',
    customerAddress: order.customer ? order.customer.address || '' : '',
    discount: isStore ? undefined : (order.discount || 0),
    status: order.status.toLowerCase(),
    createdAt: new Date(order.createdAt).getTime(),
    items: order.items.map((i: any) => {
      if (isStore) {
        return {
          id: i.id,
          skuId: i.skuId,
          code: i.itemCode,
          name: i.itemName,
          series: i.seriesName,
          color: i.colorName || 'Standard',
          qty: i.qty,
        };
      }

      let discPct = i.discountPercent;
      if (discPct === undefined || discPct === null || discPct === 0) {
        const sNameLower = (i.seriesName || '').toLowerCase();
        if (customerDiscountsMap.has(sNameLower)) {
          discPct = customerDiscountsMap.get(sNameLower)!;
        } else {
          discPct = order.discount || 0;
        }
      }

      return {
        id: i.id,
        skuId: i.skuId,
        code: i.itemCode,
        name: i.itemName,
        series: i.seriesName,
        color: i.colorName || 'Standard',
        price: i.price,
        discountPercent: discPct,
        qty: i.qty,
      };
    }),
    history: order.history
      ? order.history.map((h: any) => ({
          s: h.status,
          t: new Date(h.createdAt).getTime(),
        }))
      : [],
  };
}

// GET /api/orders with search, status, and month query param filtering
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, customerId } = req.user!;
    const { search, status, month } = req.query;

    const where: any = {};

    if (role === Role.CUSTOMER) {
      const targetId = customerId || req.user!.id;
      where.OR = [
        { customerId: targetId },
        { customerId: req.user!.id },
        { customer: { userId: req.user!.id } },
        { customer: { username: req.user!.username } },
      ];
    } else if (role === Role.STORE) {
      where.status = { in: [OrderStatus.APPROVED, OrderStatus.DISPATCHED] };
    }

    if (status && typeof status === 'string' && status !== 'all') {
      const targetStatus = status.toUpperCase() as OrderStatus;
      if (Object.values(OrderStatus).includes(targetStatus)) {
        where.status = targetStatus;
      }
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
          { id: { contains: term, mode: 'insensitive' } },
          { customer: { name: { contains: term, mode: 'insensitive' } } },
          { items: { some: { itemName: { contains: term, mode: 'insensitive' } } } },
        ],
      });
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          include: {
            seriesDiscounts: {
              include: { series: true },
            },
          },
        },
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const isStore = role === Role.STORE;
    return res.json(orders.map((o) => formatOrderResponse(o, isStore)));
  } catch (error) {
    console.error('Fetch orders error:', error);
    return res.status(500).json({ message: 'Error fetching orders' });
  }
});

// POST /api/orders - Place order (Customer only)
router.post('/', authenticateToken, requireRole([Role.CUSTOMER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user!.customerId;
    if (!customerId) return res.status(400).json({ message: 'Customer ID not found in session' });

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        seriesDiscounts: {
          include: { series: true },
        },
      },
    });
    if (!customer) return res.status(404).json({ message: 'Customer account not found' });

    const { items } = req.body; // array of { code, series, color?, qty }
    if (!items || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'Order items are required' });
    }

    const orderItemsData = [];
    for (const item of items) {
      const itemType = await prisma.itemType.findUnique({ where: { code: item.code } });
      let series = await prisma.series.findFirst({
        where: {
          OR: [
            { id: item.series },
            { name: { equals: item.series, mode: 'insensitive' } },
            { name: { contains: item.series, mode: 'insensitive' } },
          ],
        },
      });

      if (!itemType || !series) continue;

      let color = null;
      if (item.color) {
        color = await prisma.color.findFirst({
          where: { seriesId: series.id, name: { equals: item.color, mode: 'insensitive' } },
        });
      }
      if (!color) {
        color = await prisma.color.findFirst({
          where: { seriesId: series.id },
        });
      }

      const sku = await prisma.sKU.findFirst({
        where: {
          itemTypeId: itemType.id,
          seriesId: series.id,
          ...(color ? { colorId: color.id } : {}),
        },
      });

      const seriesDiscount = await prisma.customerSeriesDiscount.findFirst({
        where: {
          customerId: customer.id,
          seriesId: series.id,
        },
      });
      const discountPercent = seriesDiscount ? seriesDiscount.discountPercent : (customer.discount || 0);

      const snapshotPrice = sku && sku.currentPrice !== null ? sku.currentPrice : 0;

      orderItemsData.push({
        skuId: sku ? sku.id : null,
        itemCode: itemType.code,
        itemName: itemType.name,
        seriesName: series.name,
        colorName: color ? color.name : 'Standard',
        price: snapshotPrice,
        discountPercent,
        qty: parseInt(item.qty, 10),
      });
    }

    const newOrder = await prisma.order.create({
      data: {
        customerId: customer.id,
        discount: 0,
        status: OrderStatus.PENDING,
        items: {
          create: orderItemsData,
        },
        history: {
          create: { status: 'pending' },
        },
      },
      include: {
        customer: {
          include: {
            seriesDiscounts: {
              include: { series: true },
            },
          },
        },
        items: true,
        history: true,
      },
    });

    return res.status(201).json(formatOrderResponse(newOrder));
  } catch (error) {
    console.error('Place order error:', error);
    return res.status(500).json({ message: 'Error placing order' });
  }
});

// PATCH /api/orders/:id/status - Approve or Deny order (Manager only)
router.patch('/:id/status', authenticateToken, requireRole([Role.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const targetStatus = status.toUpperCase() as OrderStatus;
    if (!(["APPROVED", "DENIED"] as string[]).includes(targetStatus)) {
      return res.status(400).json({ message: 'Invalid status update' });
    }

    if (targetStatus === OrderStatus.APPROVED) {
      const orderToApprove = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!orderToApprove) return res.status(404).json({ message: 'Order not found' });

      for (const item of orderToApprove.items) {
        let sku = null;
        if (item.skuId) {
          sku = await prisma.sKU.findUnique({
            where: { id: item.skuId },
            include: { itemType: true, series: true, color: true },
          });
        }
        if (!sku) {
          const itemType = await prisma.itemType.findFirst({ where: { code: item.itemCode } });
          const series = await prisma.series.findFirst({ where: { name: { equals: item.seriesName, mode: 'insensitive' } } });
          const color = series ? await prisma.color.findFirst({ where: { seriesId: series.id, name: { equals: item.colorName, mode: 'insensitive' } } }) : null;
          if (itemType && series && color) {
            sku = await prisma.sKU.findUnique({
              where: { itemTypeId_seriesId_colorId: { itemTypeId: itemType.id, seriesId: series.id, colorId: color.id } },
              include: { itemType: true, series: true, color: true },
            });
          }
        }

        if (sku && sku.stockQty < item.qty) {
          return res.status(400).json({
            message: `Cannot approve order: Item "${item.itemName}" (${item.seriesName} - ${item.colorName}) requires ${item.qty} box(es), but only ${sku.stockQty} box(es) are available in stock.`,
          });
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: targetStatus,
        history: {
          create: { status: status.toLowerCase() },
        },
      },
      include: {
        customer: {
          include: {
            seriesDiscounts: {
              include: { series: true },
            },
          },
        },
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });

    return res.json(formatOrderResponse(updatedOrder));
  } catch (error) {
    console.error('Order status update error:', error);
    return res.status(500).json({ message: 'Error updating order status' });
  }
});

// PUT /api/orders/:id/modify - Modify item quantities & series discounts (Manager only)
router.put('/:id/modify', authenticateToken, requireRole([Role.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { qtyMap, seriesDiscounts, itemDiscounts, approve } = req.body;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) return res.status(404).json({ message: 'Order not found' });

    const targetStatus = approve ? OrderStatus.APPROVED : existingOrder.status;

    if (targetStatus === OrderStatus.APPROVED) {
      for (let idx = 0; idx < existingOrder.items.length; idx++) {
        const item = existingOrder.items[idx];
        const newQty = (qtyMap && qtyMap[idx] !== undefined)
          ? parseInt(String(qtyMap[idx]), 10)
          : (qtyMap && qtyMap[item.id] !== undefined ? parseInt(String(qtyMap[item.id]), 10) : item.qty);

        if (newQty > 0) {
          let sku = null;
          if (item.skuId) {
            sku = await prisma.sKU.findUnique({
              where: { id: item.skuId },
              include: { itemType: true, series: true, color: true },
            });
          }
          if (!sku) {
            const itemType = await prisma.itemType.findFirst({ where: { code: item.itemCode } });
            const series = await prisma.series.findFirst({ where: { name: { equals: item.seriesName, mode: 'insensitive' } } });
            const color = series ? await prisma.color.findFirst({ where: { seriesId: series.id, name: { equals: item.colorName, mode: 'insensitive' } } }) : null;
            if (itemType && series && color) {
              sku = await prisma.sKU.findUnique({
                where: { itemTypeId_seriesId_colorId: { itemTypeId: itemType.id, seriesId: series.id, colorId: color.id } },
                include: { itemType: true, series: true, color: true },
              });
            }
          }

          if (sku && sku.stockQty < newQty) {
            return res.status(400).json({
              message: `Cannot approve order: Item "${item.itemName}" (${item.seriesName} - ${item.colorName}) requires ${newQty} box(es), but only ${sku.stockQty} box(es) are available in stock.`,
            });
          }
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      for (let idx = 0; idx < existingOrder.items.length; idx++) {
        const item = existingOrder.items[idx];
        const newQty = (qtyMap && qtyMap[idx] !== undefined)
          ? parseInt(String(qtyMap[idx]), 10)
          : (qtyMap && qtyMap[item.id] !== undefined ? parseInt(String(qtyMap[item.id]), 10) : item.qty);

        let newDisc = item.discountPercent;
        if (seriesDiscounts && seriesDiscounts[item.seriesName] !== undefined) {
          newDisc = parseInt(String(seriesDiscounts[item.seriesName]), 10);
        } else if (itemDiscounts && itemDiscounts[item.id] !== undefined) {
          newDisc = parseInt(String(itemDiscounts[item.id]), 10);
        }

        if (newQty <= 0) {
          await tx.orderItem.delete({ where: { id: item.id } });
        } else {
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              qty: newQty,
              discountPercent: isNaN(newDisc) ? 0 : newDisc,
            },
          });
        }
      }

      await tx.order.update({
        where: { id },
        data: {
          status: targetStatus,
          history: {
            create: { status: approve ? 'approved' : 'modified' },
          },
        },
      });
    });

    const finalOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            seriesDiscounts: {
              include: { series: true },
            },
          },
        },
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });

    return res.json(formatOrderResponse(finalOrder));
  } catch (error) {
    console.error('Modify order error:', error);
    return res.status(500).json({ message: 'Error modifying order' });
  }
});

// POST /api/orders/:id/dispatch - Mark dispatched (Store or Manager)
router.post('/:id/dispatch', authenticateToken, requireRole([Role.STORE, Role.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== OrderStatus.APPROVED) {
      return res.status(400).json({ message: 'Order must be in APPROVED state to dispatch' });
    }

    const finalTotal = order.items.reduce((sum, item) => {
      const lineSubtotal = item.price * item.qty;
      const lineDiscount = lineSubtotal * (item.discountPercent / 100);
      return sum + Math.round(lineSubtotal - lineDiscount);
    }, 0);

    await prisma.$transaction(async (tx) => {
      // 1. Verify stock availability and decrement stock for each SKU
      for (const item of order.items) {
        let sku = null;
        if (item.skuId) {
          sku = await tx.sKU.findUnique({
            where: { id: item.skuId },
            include: { itemType: true, series: true, color: true }
          });
        }
        if (!sku) {
          const itemType = await tx.itemType.findFirst({ where: { code: item.itemCode } });
          const series = await tx.series.findFirst({ where: { name: { equals: item.seriesName, mode: 'insensitive' } } });
          const color = series ? await tx.color.findFirst({ where: { seriesId: series.id, name: { equals: item.colorName, mode: 'insensitive' } } }) : null;
          if (itemType && series && color) {
            sku = await tx.sKU.findUnique({
              where: { itemTypeId_seriesId_colorId: { itemTypeId: itemType.id, seriesId: series.id, colorId: color.id } },
              include: { itemType: true, series: true, color: true }
            });
          }
        }

        if (sku) {
          if (sku.stockQty < item.qty) {
            throw new Error(`Cannot dispatch: Item "${item.itemName}" (${item.seriesName} - ${item.colorName}) has only ${sku.stockQty} box(es) available in stock, but ${item.qty} box(es) are requested.`);
          }
          await tx.sKU.update({
            where: { id: sku.id },
            data: { stockQty: { decrement: item.qty } }
          });
        }
      }

      // 2. Mark dispatched & update customer balance
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.DISPATCHED,
          totalAmount: finalTotal,
          history: {
            create: { status: 'dispatched' },
          },
        },
      });

      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          balance: { increment: finalTotal },
        },
      });
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });

    const isStore = req.user!.role === Role.STORE;

    // Trigger WhatsApp notification asynchronously (non-blocking)
    whatsappService.sendDispatchNotification({
      orderId: updatedOrder!.id,
      customerName: updatedOrder!.customer.name,
      phone: updatedOrder!.customer.phone,
      totalAmount: finalTotal,
    }).catch((err) => {
      console.error('[WhatsApp] Async notification dispatch error:', err);
    });

    return res.json({
      order: formatOrderResponse(updatedOrder, isStore),
      totalAddedToBalance: isStore ? undefined : finalTotal,
      customerName: order.customer.name,
    });
  } catch (error: any) {
    console.error('Dispatch order error:', error);
    if (error && error.message && error.message.startsWith('Cannot dispatch:')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error dispatching order' });
  }
});

export default router;
