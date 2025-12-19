import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/provider/earnings/transactions
 *
 * Listar transacciones de ganancias del proveedor.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 50)
 * - type: 'credit' | 'debit' | 'all'
 * - startDate: ISO string
 * - endDate: ISO string
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "data": [
 *     {
 *       "id": "tx_123",
 *       "walletId": "wallet_456",
 *       "type": "credit",
 *       "amount": "15.19",
 *       "balance": "1250.50",
 *       "description": "Sale commission from purchase #xyz",
 *       "purchaseId": "purchase_xyz",
 *       "createdAt": "2025-11-18T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 45,
 *     "totalPages": 5
 *   }
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

    // 2. Verify user has provider role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'provider') {
      return NextResponse.json(
        { error: 'Access denied. Provider role required.' },
        { status: 403 }
      );
    }

    // 3. Get provider's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // 4. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '10', 10),
      50
    );
    const type = searchParams.get('type') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // 5. Build where clause
    const where: any = {
      OR: [
        { sourceWalletId: wallet.id },
        { destinationWalletId: wallet.id },
      ],
    };

    if (type && type !== 'all') {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // 6. Get total count
    const total = await prisma.transaction.count({ where });

    // 7. Get transactions with pagination
    const transactions = await prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // 8. Transform to response format
    const data = transactions.map((tx: any) => {
      // Extract purchaseId from metadata if exists
      let purchaseId: string | undefined;
      let withdrawalId: string | undefined;

      if (tx.relatedEntityType === 'Purchase') {
        purchaseId = tx.relatedEntityId;
      } else if (tx.relatedEntityType === 'Withdrawal') {
        withdrawalId = tx.relatedEntityId;
      }

      return {
        id: tx.id,
        walletId: tx.destinationWalletId || tx.sourceWalletId,
        type: tx.type,
        amount: tx.amount.toString(),
        description: tx.description,
        purchaseId,
        withdrawalId,
        createdAt: tx.createdAt.toISOString(),
      };
    });

    // 9. Return paginated response
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching provider transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
