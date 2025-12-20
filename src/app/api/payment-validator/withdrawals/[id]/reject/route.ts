import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment-validator/withdrawals/[id]/reject
 *
 * Reject a withdrawal request.
 * Changes status from 'pending' to 'rejected'.
 *
 * Requires payment_validator or admin role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "reason": "Reason for rejection" // Required, min 10 chars
 * }
 *
 * Response 200:
 * {
 *   "id": "withdrawal_123",
 *   "status": "rejected",
 *   "rejectionReason": "...",
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

    // 2. Parse request body
    const body = await request.json();
    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    if (reason.length < 10) {
      return NextResponse.json(
        { error: 'Rejection reason must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        { error: 'Rejection reason must be less than 500 characters' },
        { status: 400 }
      );
    }

    // 3. Find withdrawal
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

    // 4. Validate withdrawal can be rejected
    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot reject withdrawal with status: ${withdrawal.status}` },
        { status: 400 }
      );
    }

    // 5. Update withdrawal status to rejected
    const processedAt = new Date();
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: params.id },
      data: {
        status: 'rejected',
        rejectionReason: reason,
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
      rejectionReason: updatedWithdrawal.rejectionReason,
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
      message: 'Withdrawal rejected successfully',
    });
  } catch (error: unknown) {
    console.error('Error rejecting withdrawal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
