import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seller/stats
 *
 * Obtener estadísticas del vendedor (seller).
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "walletBalance": "1500.50",
 *   "totalPurchases": 45,
 *   "totalSpent": "2345.67",
 *   "thisMonthPurchases": 8,
 *   "thisMonthSpent": "345.20",
 *   "pendingRecharges": 1,
 *   "pendingRechargesAmount": "100.00"
 * }
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de seller
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

    // 2. Verify user has seller role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'seller') {
      return NextResponse.json(
        { error: 'Access denied. Seller role required.' },
        { status: 403 }
      );
    }

    // 3. Get wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    const walletBalance = wallet.balance.toString();

    // 4. Get purchase statistics (Sales)
    const orderItems = await prisma.orderItem.findMany({
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
      include: {
        variant: true,
        order: true,
      },
    });

    const totalPurchases = orderItems.length;
    const totalSpent = orderItems
      .reduce((sum: number, item: any) => sum + Number(item.variant.price), 0)
      .toFixed(2);

    // 5. Get this month's statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthItems = orderItems.filter(
      (item: any) => item.order.createdAt >= startOfMonth
    );

    const thisMonthPurchases = thisMonthItems.length;
    const thisMonthSpent = thisMonthItems
      .reduce((sum: number, item: any) => sum + Number(item.variant.price), 0)
      .toFixed(2);

    // 6. Get pending recharges statistics
    const pendingRecharges = await prisma.recharge.findMany({
      where: {
        walletId: wallet.id,
        status: 'pending',
      },
      select: {
        amount: true,
      },
    });

    const pendingRechargesCount = pendingRecharges.length;
    const pendingRechargesAmount = pendingRecharges
      .reduce((sum: number, r: any) => sum + Number(r.amount), 0)
      .toFixed(2);

    // 7. Return stats
    return NextResponse.json({
      walletBalance,
      totalPurchases,
      totalSpent,
      thisMonthPurchases,
      thisMonthSpent,
      pendingRecharges: pendingRechargesCount,
      pendingRechargesAmount,
    });
  } catch (error: any) {
    console.error('Error fetching seller stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
