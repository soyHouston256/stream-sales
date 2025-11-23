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
        status: true,
      },
    });

    const totalProducts = products.length;
    const availableProducts = products.filter(
      (p: any) => p.status === 'available'
    ).length;
    const reservedProducts = products.filter(
      (p: any) => p.status === 'reserved'
    ).length;
    const soldProducts = products.filter((p: any) => p.status === 'sold').length;

    // 4. Get sales statistics from purchases
    // IMPORTANTE: Solo contar compras completadas, NO refunded
    const purchases = await prisma.purchase.findMany({
      where: {
        providerId: user.id,
        status: 'completed', // Excluye refunded automáticamente
      },
      select: {
        providerEarnings: true,
        createdAt: true,
      },
    });

    const totalSales = purchases.length;
    const totalEarnings = purchases
      .reduce((sum: number, p: any) => sum + Number(p.providerEarnings), 0)
      .toFixed(2);

    // 5. Get this month's statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthPurchases = purchases.filter(
      (p: any) => p.createdAt >= startOfMonth
    );
    const thisMonthSales = thisMonthPurchases.length;
    const thisMonthEarnings = thisMonthPurchases
      .reduce((sum: number, p: any) => sum + Number(p.providerEarnings), 0)
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
