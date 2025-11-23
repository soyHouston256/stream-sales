import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/withdrawals
 *
 * Listar todas las solicitudes de retiro (admin only).
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '10', 10),
      50
    );

    // 4. Build where clause
    const where: any = {};
    if (status !== 'all') {
      where.status = status;
    }

    // 5. Get total count
    const total = await prisma.withdrawal.count({ where });

    // 6. Get withdrawals with pagination
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

    // 7. Transform to response format
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
      processedBy: withdrawal.processedByUser ? {
        id: withdrawal.processedByUser.id,
        name: withdrawal.processedByUser.name || withdrawal.processedByUser.email,
        email: withdrawal.processedByUser.email,
      } : null,
    }));

    // 8. Return paginated response
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
