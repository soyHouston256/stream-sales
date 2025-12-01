import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/provider/stats
 *
 * Obtener estadísticas del proveedor (provider).
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "totalProducts": 25,
 *   "availableProducts": 10,
 *   "reservedProducts": 5,
 *   "soldProducts": 10,
 *   "totalEarnings": "1250.50",
 *   "thisMonthEarnings": "450.20",
 *   "pendingBalance": "850.30",
 *   "totalSales": 10,
 *   "thisMonthSales": 4
 * }
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de provider
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify JWT token
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyJWT(token);

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Verify user has provider role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'provider') {
      return NextResponse.json(
        { error: 'Access denied. Provider role required.' },
        { status: 403 }
      );
    }

    // 3. Get product statistics
    const products = await prisma.product.findMany({
      where: { providerId: user.id },
      select: {
        isActive: true,
      },
    });

    const totalProducts = products.length;
    const availableProducts = products.filter((p: any) => p.isActive).length;
    const reservedProducts = products.filter((p: any) => !p.isActive).length;
    const soldProducts = 0; // Concept changed: Products are templates now. Sales are tracked separately.

    // 4. Get sales statistics from OrderItems (replacing purchases)
    const soldItems = await prisma.orderItem.findMany({
      where: {
        variant: {
          product: {
            providerId: user.id,
          },
        },
        order: {
          status: 'paid',
        },
      },
      select: {
        variant: {
          select: {
            price: true,
          },
        },
        order: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    const totalSales = soldItems.length;
    const totalEarnings = soldItems
      .reduce((sum: number, item: any) => sum + item.variant.price.toNumber(), 0)
      .toFixed(2);

    // 5. Get this month's statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthItems = soldItems.filter(
      (item: any) => item.order.createdAt >= startOfMonth
    );
    const thisMonthSales = thisMonthItems.length;
    const thisMonthEarnings = thisMonthItems
      .reduce((sum: number, item: any) => sum + item.variant.price.toNumber(), 0)
      .toFixed(2);

    // 6. Get wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    const pendingBalance = wallet ? wallet.balance.toString() : '0.00';

    // 7. Return stats
    return NextResponse.json({
      totalProducts,
      availableProducts,
      reservedProducts,
      soldProducts,
      totalEarnings,
      thisMonthEarnings,
      pendingBalance,
      totalSales,
      thisMonthSales,
    });
  } catch (error: any) {
    console.error('Error fetching provider stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
