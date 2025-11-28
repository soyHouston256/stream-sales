import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payment-validator/withdrawals
 *
 * List all withdrawal requests.
 * Requires authentication and payment_validator or admin role.
 *
 * Query params:
 * - status: 'pending' | 'approved' | 'rejected' | 'completed' | 'all'
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 50)
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "data": [...],
 *   "pagination": {...}
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify user role (payment_validator or admin)
    const auth = await verifyPaymentValidator(request);
    if (!auth.success) {
      return auth.error;
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '10', 10),
      50
    );

    // 3. Build where clause
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    // 4. Get total count
    const total = await prisma.withdrawal.count({ where });

    // 5. Get withdrawals with pagination
    const withdrawals = await prisma.withdrawal.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { requestedAt: 'desc' },
      include: {
        wallet: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        processedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 6. Transform to response format
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
      completedAt: withdrawal.completedAt?.toISOString(),
      user: {
        id: withdrawal.wallet.user.id,
        name: withdrawal.wallet.user.name || withdrawal.wallet.user.email,
        email: withdrawal.wallet.user.email,
        role: withdrawal.wallet.user.role,
      },
      walletBalance: withdrawal.wallet.balance.toString(),
      processedBy: withdrawal.processedByUser ? {
        id: withdrawal.processedByUser.id,
        name: withdrawal.processedByUser.name || withdrawal.processedByUser.email,
        email: withdrawal.processedByUser.email,
      } : null,
    }));

    // 7. Return paginated response
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
