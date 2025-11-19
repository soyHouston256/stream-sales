import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * POST /api/admin/withdrawals/[id]/reject
 *
 * Rechazar una solicitud de retiro (admin only).
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "rejectionReason": "Insufficient documentation provided"
 * }
 *
 * Response 200:
 * {
 *   "id": "withdrawal_123",
 *   "status": "rejected",
 *   "rejectionReason": "...",
 *   "processedAt": "2025-11-18T10:30:00Z"
 * }
 */

const rejectSchema = z.object({
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

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

    // 3. Validate request body
    const body = await request.json();
    const validationResult = rejectSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { rejectionReason } = validationResult.data;

    // 4. Find withdrawal
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: params.id },
    });

    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    // 5. Validate status
    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot reject withdrawal with status: ${withdrawal.status}` },
        { status: 400 }
      );
    }

    // 6. Update withdrawal to rejected
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: params.id },
      data: {
        status: 'rejected',
        rejectionReason,
        processedAt: new Date(),
        processedBy: user.id,
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

    console.log('[WITHDRAWAL] Rejected:', {
      id: updatedWithdrawal.id,
      amount: updatedWithdrawal.amount.toString(),
      rejectedBy: user.email,
      reason: rejectionReason,
    });

    // 7. Return updated withdrawal
    return NextResponse.json({
      id: updatedWithdrawal.id,
      walletId: updatedWithdrawal.walletId,
      amount: updatedWithdrawal.amount.toString(),
      status: updatedWithdrawal.status,
      rejectionReason: updatedWithdrawal.rejectionReason,
      processedAt: updatedWithdrawal.processedAt?.toISOString(),
      processedBy: updatedWithdrawal.processedByUser ? {
        id: updatedWithdrawal.processedByUser.id,
        name: updatedWithdrawal.processedByUser.name || updatedWithdrawal.processedByUser.email,
        email: updatedWithdrawal.processedByUser.email,
      } : null,
    });
  } catch (error: any) {
    console.error('Error rejecting withdrawal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
