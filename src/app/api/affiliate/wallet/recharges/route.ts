import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/affiliate/wallet/recharges
 *
 * Obtener el historial de recargas del afiliado autenticado.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * [
 *   {
 *     "id": "recharge_123",
 *     "walletId": "wallet_456",
 *     "amount": "100.00",
 *     "paymentMethod": "credit_card",
 *     "paymentGateway": "manual",
 *     "externalTransactionId": null,
 *     "status": "completed",
 *     "createdAt": "2025-11-27T10:30:00Z",
 *     "completedAt": "2025-11-27T11:00:00Z"
 *   }
 * ]
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de affiliate
 * - 404 Not Found: Usuario no tiene billetera
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

    // 2. Verify user has affiliate role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'affiliate') {
      return NextResponse.json(
        { error: 'Access denied. Affiliate role required.' },
        { status: 403 }
      );
    }

    // 3. Get user's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // 4. Fetch recharges
    const recharges = await prisma.recharge.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });

    // 5. Return formatted recharges
    return NextResponse.json(
      recharges.map((recharge) => ({
        id: recharge.id,
        walletId: recharge.walletId,
        amount: recharge.amount.toString(),
        paymentMethod: recharge.paymentMethod,
        paymentGateway: recharge.paymentGateway,
        externalTransactionId: recharge.externalTransactionId,
        status: recharge.status,
        createdAt: recharge.createdAt.toISOString(),
        completedAt: recharge.completedAt?.toISOString() || null,
      }))
    );
  } catch (error: unknown) {
    console.error('Error fetching affiliate recharges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
