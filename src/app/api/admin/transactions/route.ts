import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/admin/transactions
 *
 * List all transactions in the system with filters and pagination.
 * Requires authentication and admin role.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 50)
 * - type: 'credit' | 'debit' | 'transfer'
 * - dateFrom: ISO date string
 * - dateTo: ISO date string
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "data": [
 *     {
 *       "id": "trans_123",
 *       "type": "credit",
 *       "amount": "100.00",
 *       "sourceWalletId": "wallet_456",
 *       "destinationWalletId": "wallet_789",
 *       "sourceUser": {
 *         "id": "user_1",
 *         "email": "john@example.com",
 *         "name": "John Doe"
 *       },
 *       "destinationUser": {
 *         "id": "user_2",
 *         "email": "jane@example.com",
 *         "name": "Jane Smith"
 *       },
 *       "description": "Purchase payment",
 *       "relatedEntityType": "Purchase",
 *       "relatedEntityId": "purchase_123",
 *       "metadata": {},
 *       "createdAt": "2025-11-16T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 145,
 *     "totalPages": 15
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
    const type = searchParams.get('type') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    // 4. Build where clause
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // 5. Get total count
    const total = await prisma.transaction.count({ where });

    // 6. Get transactions with wallet and user data
    const transactions = await prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sourceWallet: {
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
        destinationWallet: {
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

    // 7. Transform to response format
    const data = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount.toString(),
      sourceWalletId: tx.sourceWalletId,
      destinationWalletId: tx.destinationWalletId,
      sourceUser: tx.sourceWallet
        ? {
            id: tx.sourceWallet.user.id,
            email: tx.sourceWallet.user.email,
            name: tx.sourceWallet.user.name,
            role: tx.sourceWallet.user.role,
          }
        : null,
      destinationUser: tx.destinationWallet
        ? {
            id: tx.destinationWallet.user.id,
            email: tx.destinationWallet.user.email,
            name: tx.destinationWallet.user.name,
            role: tx.destinationWallet.user.role,
          }
        : null,
      description: tx.description,
      relatedEntityType: tx.relatedEntityType,
      relatedEntityId: tx.relatedEntityId,
      metadata: tx.metadata || {},
      createdAt: tx.createdAt.toISOString(),
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
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
