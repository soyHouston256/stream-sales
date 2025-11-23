import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/recharges/:id/reject
 *
 * Reject a pending recharge request.
 * This will update the recharge status to 'cancelled' or 'failed'
 * and store the rejection reason.
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
 *   "rejectedBy": "admin_789",
 *   "rejectedAt": "2025-11-16T10:30:00Z",
 *   "message": "Recharge request rejected"
 * }
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verify JWT token and admin role
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

    // 2. Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse request body
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

    // 4. Find the recharge
    const recharge = await prisma.recharge.findUnique({
      where: { id: params.id },
    });

    if (!recharge) {
      return NextResponse.json(
        { error: 'Recharge request not found' },
        { status: 404 }
      );
    }

    // 5. Check if recharge is pending
    if (recharge.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot reject recharge with status: ${recharge.status}` },
        { status: 400 }
      );
    }

    // 6. Update recharge status to cancelled/failed
    const rejectedAt = new Date();
    const updatedRecharge = await prisma.recharge.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        metadata: {
          ...((recharge.metadata as any) || {}),
          rejectionReason: reason,
          rejectedBy: payload.userId,
          rejectedAt: rejectedAt.toISOString(),
        },
      },
    });

    // 7. Return success response
    return NextResponse.json({
      id: updatedRecharge.id,
      walletId: updatedRecharge.walletId,
      amount: updatedRecharge.amount.toString(),
      paymentMethod: updatedRecharge.paymentMethod,
      status: updatedRecharge.status,
      rejectionReason: reason,
      rejectedBy: payload.userId,
      rejectedAt: rejectedAt.toISOString(),
      createdAt: updatedRecharge.createdAt.toISOString(),
      message: 'Recharge request rejected',
    });
  } catch (error: any) {
    console.error('Error rejecting recharge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
