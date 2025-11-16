import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/seller/wallet/recharges
 *
 * Obtener historial de recargas de la billetera del vendedor.
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
 *     "status": "pending",
 *     "createdAt": "2025-11-15T10:30:00Z",
 *     "completedAt": null
 *   }
 * ]
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de seller
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

    // 4. Get all recharges for this wallet
    const recharges = await prisma.recharge.findMany({
      where: {
        walletId: wallet.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 5. Transform to response format
    const data = recharges.map((recharge) => ({
      id: recharge.id,
      walletId: recharge.walletId,
      amount: recharge.amount.toString(),
      paymentMethod: recharge.paymentMethod,
      paymentGateway: recharge.paymentGateway,
      externalTransactionId: recharge.externalTransactionId,
      status: recharge.status,
      createdAt: recharge.createdAt.toISOString(),
      completedAt: recharge.completedAt?.toISOString() || null,
    }));

    // 6. Return recharges
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching recharges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
