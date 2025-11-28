import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment-validator/withdrawals/[id]/approve
 *
 * Approve a withdrawal request.
 * Changes status from 'pending' to 'approved'.
 *
 * Requires payment_validator or admin role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "id": "withdrawal_123",
 *   "status": "approved",
 *   "processedAt": "2025-11-18T10:30:00Z",
 *   "processedBy": {...}
 * }
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

    // 2. Find withdrawal
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

    // 3. Validate withdrawal can be approved
    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot approve withdrawal with status: ${withdrawal.status}` },
        { status: 400 }
      );
    }

    // 4. Check wallet has sufficient balance
    if (withdrawal.wallet.balance.lessThan(withdrawal.amount)) {
      return NextResponse.json(
        {
          error: 'Insufficient wallet balance',
          walletBalance: withdrawal.wallet.balance.toString(),
          withdrawalAmount: withdrawal.amount.toString(),
        },
        { status: 400 }
      );
    }

    // 5. Update withdrawal status to approved
    const processedAt = new Date();
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: params.id },
      data: {
        status: 'approved',
        processedAt,
        processedBy: auth.userId,
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

    // 6. Return success response
    return NextResponse.json({
      id: updatedWithdrawal.id,
      walletId: updatedWithdrawal.walletId,
      amount: updatedWithdrawal.amount.toString(),
      paymentMethod: updatedWithdrawal.paymentMethod,
      paymentDetails: updatedWithdrawal.paymentDetails,
      status: updatedWithdrawal.status,
      notes: updatedWithdrawal.notes,
      processedAt: updatedWithdrawal.processedAt?.toISOString(),
      processedBy: updatedWithdrawal.processedByUser ? {
        id: updatedWithdrawal.processedByUser.id,
        name: updatedWithdrawal.processedByUser.name || updatedWithdrawal.processedByUser.email,
        email: updatedWithdrawal.processedByUser.email,
        role: auth.role,
      } : null,
      user: {
        id: updatedWithdrawal.wallet.user.id,
        name: updatedWithdrawal.wallet.user.name || updatedWithdrawal.wallet.user.email,
        email: updatedWithdrawal.wallet.user.email,
      },
      message: 'Withdrawal approved successfully. Please complete the payment to finalize.',
    });
  } catch (error: any) {
    console.error('Error approving withdrawal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
