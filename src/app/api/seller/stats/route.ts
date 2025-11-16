import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

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

    // 4. Get purchase statistics
    const purchases = await prisma.purchase.findMany({
      where: { sellerId: user.id },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    const totalPurchases = purchases.length;
    const totalSpent = purchases
      .reduce((sum, p) => sum + Number(p.amount), 0)
      .toFixed(2);

    // 5. Get this month's statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthPurchases = purchases.filter(
      (p) => p.createdAt >= startOfMonth
    ).length;

    const thisMonthSpent = purchases
      .filter((p) => p.createdAt >= startOfMonth)
      .reduce((sum, p) => sum + Number(p.amount), 0)
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
      .reduce((sum, r) => sum + Number(r.amount), 0)
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
