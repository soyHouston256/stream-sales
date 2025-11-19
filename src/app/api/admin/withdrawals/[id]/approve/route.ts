import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * POST /api/admin/withdrawals/[id]/approve
 *
 * Aprobar una solicitud de retiro (admin only).
 * Cambia el status de 'pending' a 'approved'.
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

    // 4. Validate status
    if (withdrawal.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot approve withdrawal with status: ${withdrawal.status}` },
        { status: 400 }
      );
    }

    // 5. Update withdrawal to approved
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: params.id },
      data: {
        status: 'approved',
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

    console.log('[WITHDRAWAL] Approved:', {
      id: updatedWithdrawal.id,
      amount: updatedWithdrawal.amount.toString(),
      approvedBy: user.email,
    });

    // 6. Return updated withdrawal
    return NextResponse.json({
      id: updatedWithdrawal.id,
      walletId: updatedWithdrawal.walletId,
      amount: updatedWithdrawal.amount.toString(),
      status: updatedWithdrawal.status,
      processedAt: updatedWithdrawal.processedAt?.toISOString(),
      processedBy: updatedWithdrawal.processedByUser ? {
        id: updatedWithdrawal.processedByUser.id,
        name: updatedWithdrawal.processedByUser.name || updatedWithdrawal.processedByUser.email,
        email: updatedWithdrawal.processedByUser.email,
      } : null,
    });
  } catch (error: any) {
    console.error('Error approving withdrawal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
