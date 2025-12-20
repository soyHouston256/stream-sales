import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/payment-validator/recharges/:id/reject
 *
 * Reject a pending recharge request.
 * This will update the recharge status to 'cancelled' or 'failed'
 * and store the rejection reason.
 *
 * Requires payment_validator or admin role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "reason": "Payment verification failed", // Required, 10-500 characters
 *   "status": "cancelled" | "failed" // Optional, default: "cancelled"
 * }
 *
 * Response 200:
 * {
 *   "id": "recharge_123",
 *   "walletId": "wallet_456",
 *   "amount": "100.00",
 *   "status": "cancelled",
 *   "rejectionReason": "Payment verification failed",
 *   "rejectedBy": "validator_789",
 *   "rejectedAt": "2025-11-16T10:30:00Z",
 *   "message": "Recharge request rejected"
 * }
 */

export async function PUT(
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
    const newStatus = body.status || 'cancelled';

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

    if (!['cancelled', 'failed'].includes(newStatus)) {
      return NextResponse.json(
        { error: 'Status must be either "cancelled" or "failed"' },
        { status: 400 }
      );
    }

    // 3. Find the recharge
    const recharge = await prisma.recharge.findUnique({
      where: { id: params.id },
    });

    if (!recharge) {
      return NextResponse.json(
        { error: 'Recharge request not found' },
        { status: 404 }
      );
    }

    // 4. Check if recharge is pending
    if (recharge.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot reject recharge with status: ${recharge.status}` },
        { status: 400 }
      );
    }

    // 5. Update recharge status to cancelled/failed
    const rejectedAt = new Date();
    const updatedRecharge = await prisma.recharge.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        metadata: {
          ...((recharge.metadata as any) || {}),
          rejectionReason: reason,
          rejectedBy: auth.userId,
          rejectedByRole: auth.role,
          rejectedAt: rejectedAt.toISOString(),
        },
      },
    });

    // 6. Return success response
    return NextResponse.json({
      id: updatedRecharge.id,
      walletId: updatedRecharge.walletId,
      amount: updatedRecharge.amount.toString(),
      paymentMethod: updatedRecharge.paymentMethod,
      status: updatedRecharge.status,
      rejectionReason: reason,
      rejectedBy: auth.userId,
      rejectedByRole: auth.role,
      rejectedAt: rejectedAt.toISOString(),
      createdAt: updatedRecharge.createdAt.toISOString(),
      message: 'Recharge request rejected',
    });
  } catch (error: unknown) {
    console.error('Error rejecting recharge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
