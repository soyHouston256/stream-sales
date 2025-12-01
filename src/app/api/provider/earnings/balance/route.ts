import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/provider/earnings/balance
 *
 * Obtener balance de ganancias del proveedor.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "balance": "1250.50",           // Current available balance in wallet
 *   "totalEarnings": "5000.00",     // Lifetime earnings from sales
 *   "totalWithdrawals": "3500.00",  // Total withdrawn amount
 *   "pendingWithdrawals": "250.00"  // Total in pending withdrawals
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

    // 3. Get provider's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found. Please contact support.' },
        { status: 404 }
      );
    }

    // 4. Calculate total earnings from completed sales (exclude refunded)
    // Note: In the new schema, we sum the price of variants sold. 
    // TODO: Handle commissions and store net earnings in OrderItem or Transaction.
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
      include: {
        variant: true,
      },
    });

    const totalEarnings = soldItems.reduce(
      (sum: number, item: any) => sum + item.variant.price.toNumber(),
      0
    );

    // 5. Calculate total withdrawals (completed only)
    const withdrawalsResult = await prisma.withdrawal.aggregate({
      where: {
        walletId: wallet.id,
        status: 'completed',
      },
      _sum: {
        amount: true,
      },
    });

    const totalWithdrawals = withdrawalsResult._sum.amount?.toNumber() || 0;

    // 6. Calculate pending withdrawals
    const pendingWithdrawalsResult = await prisma.withdrawal.aggregate({
      where: {
        walletId: wallet.id,
        status: {
          in: ['pending', 'approved'],
        },
      },
      _sum: {
        amount: true,
      },
    });

    const pendingWithdrawals = pendingWithdrawalsResult._sum.amount?.toNumber() || 0;

    // 7. Current balance
    const currentBalance = wallet.balance.toNumber();

    // 8. Return balance info
    return NextResponse.json({
      balance: currentBalance.toFixed(2),
      totalEarnings: totalEarnings.toFixed(2),
      totalWithdrawals: totalWithdrawals.toFixed(2),
      pendingWithdrawals: pendingWithdrawals.toFixed(2),
    });
  } catch (error: any) {
    console.error('Error fetching provider balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
