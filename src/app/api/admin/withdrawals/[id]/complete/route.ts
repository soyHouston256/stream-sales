import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/withdrawals/[id]/complete
 *
 * Completar una solicitud de retiro aprobada (admin only).
 * Ejecuta la transacción de débito en el wallet del provider.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "id": "withdrawal_123",
 *   "status": "completed",
 *   "transactionId": "tx_456",
 *   "completedAt": "2025-11-18T10:30:00Z"
 * }
 *
 * Business Rules:
 * - Solo se puede completar si status = 'approved'
 * - Ejecuta un debit transaction en el wallet
 * - Actualiza el balance del wallet
 * - Marca la withdrawal como completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 2. Verify user has admin role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // 3. Find withdrawal with wallet
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: params.id },
      include: {
        wallet: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    // 4. Validate status
    if (withdrawal.status !== 'approved') {
      return NextResponse.json(
        { error: `Cannot complete withdrawal with status: ${withdrawal.status}. Must be approved first.` },
        { status: 400 }
      );
    }

    // 5. Verify wallet has sufficient balance
    const wallet = withdrawal.wallet;
    const withdrawalAmount = withdrawal.amount;

    if (wallet.balance.lessThan(withdrawalAmount)) {
      return NextResponse.json(
        {
          error: 'Insufficient balance in wallet',
          details: `Available: ${wallet.balance.toString()}, Required: ${withdrawalAmount.toString()}`,
        },
        { status: 400 }
      );
    }

    // 6. Execute withdrawal transaction (atomic)
    const result = await prisma.$transaction(async (tx) => {
      // a. Debit wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: withdrawalAmount,
          },
        },
      });

      // b. Create debit transaction
      const transaction = await tx.transaction.create({
        data: {
          type: 'debit',
          amount: withdrawalAmount,
          sourceWalletId: wallet.id,
          destinationWalletId: null,
          relatedEntityType: 'Withdrawal',
          relatedEntityId: withdrawal.id,
          description: `Withdrawal to ${withdrawal.paymentMethod}: ${withdrawal.paymentDetails}`,
          idempotencyKey: `withdrawal-${withdrawal.id}-${Date.now()}`,
        },
      });

      // c. Update withdrawal to completed
      const completedWithdrawal = await tx.withdrawal.update({
        where: { id: params.id },
        data: {
          status: 'completed',
          transactionId: transaction.id,
          completedAt: new Date(),
        },
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

      return {
        withdrawal: completedWithdrawal,
        transaction,
        newBalance: updatedWallet.balance,
      };
    });

    console.log('[WITHDRAWAL] Completed:', {
      id: result.withdrawal.id,
      amount: result.withdrawal.amount.toString(),
      transactionId: result.transaction.id,
      newBalance: result.newBalance.toString(),
      completedBy: user.email,
    });

    // 7. Return completed withdrawal
    return NextResponse.json({
      id: result.withdrawal.id,
      walletId: result.withdrawal.walletId,
      amount: result.withdrawal.amount.toString(),
      status: result.withdrawal.status,
      transactionId: result.withdrawal.transactionId,
      completedAt: result.withdrawal.completedAt?.toISOString(),
      processedBy: result.withdrawal.processedByUser ? {
        id: result.withdrawal.processedByUser.id,
        name: result.withdrawal.processedByUser.name || result.withdrawal.processedByUser.email,
        email: result.withdrawal.processedByUser.email,
      } : null,
      newWalletBalance: result.newBalance.toString(),
    });
  } catch (error: any) {
    console.error('Error completing withdrawal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
