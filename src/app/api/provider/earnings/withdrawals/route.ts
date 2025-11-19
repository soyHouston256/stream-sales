import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/provider/earnings/withdrawals
 *
 * Listar solicitudes de retiro del proveedor.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * [
 *   {
 *     "id": "withdrawal_123",
 *     "walletId": "wallet_456",
 *     "amount": "500.00",
 *     "paymentMethod": "paypal",
 *     "paymentDetails": "provider@example.com",
 *     "status": "pending",
 *     "requestedAt": "2025-11-18T10:30:00Z",
 *     "processedAt": null,
 *     "rejectionReason": null,
 *     "processedBy": null
 *   }
 * ]
 *
 * Note: This is a placeholder endpoint. The withdrawals table doesn't exist yet.
 * TODO: Create Withdrawal model and implement withdrawal system
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
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // 4. Get withdrawals
    const withdrawals = await prisma.withdrawal.findMany({
      where: { walletId: wallet.id },
      orderBy: { requestedAt: 'desc' },
      include: {
        processedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 5. Transform to response format
    const data = withdrawals.map((withdrawal: any) => ({
      id: withdrawal.id,
      walletId: withdrawal.walletId,
      amount: withdrawal.amount.toString(),
      paymentMethod: withdrawal.paymentMethod,
      paymentDetails: withdrawal.paymentDetails,
      status: withdrawal.status,
      notes: withdrawal.notes,
      rejectionReason: withdrawal.rejectionReason,
      transactionId: withdrawal.transactionId,
      requestedAt: withdrawal.requestedAt.toISOString(),
      processedAt: withdrawal.processedAt?.toISOString(),
      processedBy: withdrawal.processedByUser ? {
        id: withdrawal.processedByUser.id,
        name: withdrawal.processedByUser.name || withdrawal.processedByUser.email,
        email: withdrawal.processedByUser.email,
      } : null,
      completedAt: withdrawal.completedAt?.toISOString(),
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching provider withdrawals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
