import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment-validator/withdrawals/[id]/complete
 *
 * Complete an approved withdrawal request.
 * Executes the debit transaction on the provider's wallet.
 *
 * Requires payment_validator or admin role.
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
 * - Can only complete if status = 'approved'
 * - Executes a debit transaction on the wallet
 * - Updates the wallet balance
 * - Marks the withdrawal as completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verify user role (payment_validator or admin)
    const auth = await verifyPaymentValidator(request);
    if (!auth.success) {
      return auth.error;
    }

    // 2. Find withdrawal with wallet
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

    // 3. Validate status
    if (withdrawal.status !== 'approved') {
      return NextResponse.json(
        { error: `Cannot complete withdrawal with status: ${withdrawal.status}. Must be approved first.` },
        { status: 400 }
      );
    }

    // 4. Verify wallet has sufficient balance
    const wallet = withdrawal.wallet;
    const withdrawalAmount = withdrawal.amount;

    if (wallet.balance.lessThan(withdrawalAmount)) {
      return NextResponse.json(
        {
          error: 'Insufficient wallet balance',
          currentBalance: wallet.balance.toString(),
          withdrawalAmount: withdrawalAmount.toString(),
        },
        { status: 400 }
      );
    }

    // 5. Generate idempotency key
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`withdrawal-${params.id}-${Date.now()}`)
      .digest('hex');

    // 6. Execute withdrawal in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 6.1. Update wallet balance (debit)
      const updatedWallet = await tx.wallet.update({
        where: { id: withdrawal.walletId },
        data: {
          balance: {
            decrement: withdrawalAmount,
          },
        },
      });

      // 6.2. Create debit transaction
      const transaction = await tx.transaction.create({
        data: {
          type: 'debit',
          amount: withdrawalAmount,
          sourceWalletId: withdrawal.walletId,
          relatedEntityType: 'Withdrawal',
          relatedEntityId: withdrawal.id,
          description: `Withdrawal to ${withdrawal.paymentMethod}: ${withdrawal.paymentDetails}`,
          metadata: {
            paymentMethod: withdrawal.paymentMethod,
            paymentDetails: withdrawal.paymentDetails,
            completedBy: auth.userId,
            completedByRole: auth.role,
          },
          idempotencyKey,
        },
      });

      // 6.3. Update withdrawal status to completed
      const updatedWithdrawal = await tx.withdrawal.update({
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
          wallet: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return {
        withdrawal: updatedWithdrawal,
        transaction,
        wallet: updatedWallet,
      };
    });

    // 7. Return success response
    return NextResponse.json({
      id: result.withdrawal.id,
      walletId: result.withdrawal.walletId,
      amount: result.withdrawal.amount.toString(),
      paymentMethod: result.withdrawal.paymentMethod,
      paymentDetails: result.withdrawal.paymentDetails,
      status: result.withdrawal.status,
      transactionId: result.transaction.id,
      completedAt: result.withdrawal.completedAt?.toISOString(),
      newWalletBalance: result.wallet.balance.toString(),
      user: {
        id: result.withdrawal.wallet.user.id,
        name: result.withdrawal.wallet.user.name || result.withdrawal.wallet.user.email,
        email: result.withdrawal.wallet.user.email,
      },
      message: 'Withdrawal completed successfully',
    });
  } catch (error: any) {
    console.error('Error completing withdrawal:', error);

    // Check for idempotency key conflict
    if (error.code === 'P2002' && error.meta?.target?.includes('idempotencyKey')) {
      return NextResponse.json(
        { error: 'This withdrawal has already been processed' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
