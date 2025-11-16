import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/admin/recharges
 *
 * List all wallet recharges with filters and pagination.
 * Requires authentication and admin role.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 50)
 * - status: 'pending' | 'completed' | 'failed' | 'cancelled'
 * - paymentMethod: 'credit_card' | 'paypal' | 'bank_transfer' | 'crypto' | 'mock'
 * - search: string (search by user name, email, or wallet ID)
 * - dateFrom: ISO date string
 * - dateTo: ISO date string
 * - sortBy: 'createdAt' | 'amount' (default: 'createdAt')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "data": [
 *     {
 *       "id": "recharge_123",
 *       "walletId": "wallet_456",
 *       "wallet": {
 *         "id": "wallet_456",
 *         "userId": "user_789",
 *         "balance": "250.00",
 *         "currency": "USD",
 *         "status": "active"
 *       },
 *       "user": {
 *         "id": "user_789",
 *         "name": "John Doe",
 *         "email": "john@example.com",
 *         "role": "seller"
 *       },
 *       "amount": "100.00",
 *       "paymentMethod": "credit_card",
 *       "paymentGateway": "manual",
 *       "externalTransactionId": null,
 *       "status": "pending",
 *       "metadata": {},
 *       "createdAt": "2025-11-15T10:30:00Z",
 *       "completedAt": null
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 45,
 *     "totalPages": 5
 *   },
 *   "summary": {
 *     "pending": 15,
 *     "completed": 25,
 *     "failed": 3,
 *     "cancelled": 2,
 *     "totalPendingAmount": "1500.00",
 *     "totalCompletedAmount": "12500.00"
 *   }
 * }
 */

export async function GET(request: NextRequest) {
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    const status = searchParams.get('status') || undefined;
    const paymentMethod = searchParams.get('paymentMethod') || undefined;
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // 4. Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // 5. Build order by clause
    let orderBy: any = {};
    if (sortBy === 'amount') {
      orderBy.amount = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // 6. Get total count for summary
    const [pendingCount, completedCount, failedCount, cancelledCount] =
      await Promise.all([
        prisma.recharge.count({ where: { status: 'pending' } }),
        prisma.recharge.count({ where: { status: 'completed' } }),
        prisma.recharge.count({ where: { status: 'failed' } }),
        prisma.recharge.count({ where: { status: 'cancelled' } }),
      ]);

    // 7. Calculate total amounts
    const pendingRecharges = await prisma.recharge.findMany({
      where: { status: 'pending' },
    });
    const completedRecharges = await prisma.recharge.findMany({
      where: { status: 'completed' },
    });

    const totalPendingAmount = pendingRecharges.reduce(
      (sum: number, r: any) => sum + parseFloat(r.amount.toString()),
      0
    );
    const totalCompletedAmount = completedRecharges.reduce(
      (sum: number, r: any) => sum + parseFloat(r.amount.toString()),
      0
    );

    // 8. Get total count for filtered results
    const total = await prisma.recharge.count({ where });

    // 9. Get recharges with wallet and user data
    let recharges = await prisma.recharge.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
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
      },
    });

    // 10. Filter by search if specified
    if (search) {
      const searchLower = search.toLowerCase();
      recharges = recharges.filter(
        (recharge: any) =>
          recharge.wallet.user.name?.toLowerCase().includes(searchLower) ||
          recharge.wallet.user.email.toLowerCase().includes(searchLower) ||
          recharge.walletId.toLowerCase().includes(searchLower) ||
          recharge.id.toLowerCase().includes(searchLower)
      );
    }

    // 11. Transform to response format
    const data = recharges.map((recharge: any) => ({
      id: recharge.id,
      walletId: recharge.walletId,
      wallet: {
        id: recharge.wallet.id,
        userId: recharge.wallet.userId,
        balance: recharge.wallet.balance.toString(),
        currency: recharge.wallet.currency,
        status: recharge.wallet.status,
      },
      user: {
        id: recharge.wallet.user.id,
        name: recharge.wallet.user.name || 'Unknown',
        email: recharge.wallet.user.email,
        role: recharge.wallet.user.role,
      },
      amount: recharge.amount.toString(),
      paymentMethod: recharge.paymentMethod,
      paymentGateway: recharge.paymentGateway,
      externalTransactionId: recharge.externalTransactionId,
      status: recharge.status,
      metadata: recharge.metadata || {},
      createdAt: recharge.createdAt.toISOString(),
      completedAt: recharge.completedAt?.toISOString() || null,
    }));

    // 12. Return paginated response with summary
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: search ? data.length : total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        pending: pendingCount,
        completed: completedCount,
        failed: failedCount,
        cancelled: cancelledCount,
        totalPendingAmount: totalPendingAmount.toFixed(2),
        totalCompletedAmount: totalCompletedAmount.toFixed(2),
      },
    });
  } catch (error: any) {
    console.error('Error fetching recharges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
