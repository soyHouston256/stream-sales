import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seller/wallet/transactions
 *
 * Obtener historial de transacciones de la billetera del vendedor.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - type: 'credit' | 'debit' | 'transfer'
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
 *       "type": "debit",
 *       "amount": "15.99",
 *       "description": "Purchase: Netflix Premium",
 *       "relatedEntityType": "Purchase",
 *       "relatedEntityId": "purchase_456",
 *       "createdAt": "2025-11-15T10:30:00Z",
 *       "balanceAfter": "1484.51"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 125,
 *     "totalPages": 13
 *   }
 * }
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de seller
 * - 404 Not Found: Usuario no tiene billetera
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

    // 2. Verify user has seller role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'seller') {
      return NextResponse.json(
        { error: 'Access denied. Seller role required.' },
        { status: 403 }
      );
    }

    // 3. Get user's wallet
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

    // 5. Build where clause for transactions
    // A seller can have transactions as source or destination
    const where: any = {
      OR: [
        { sourceWalletId: wallet.id },
        { destinationWalletId: wallet.id },
      ],
    };

    if (type) {
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
      // Determine if this is a debit or credit for the seller
      const isDebit = tx.sourceWalletId === wallet.id;
      const amount = tx.amount.toString();

      return {
        id: tx.id,
        type: tx.type,
        amount,
        description: tx.description || '',
        relatedEntityType: tx.relatedEntityType || undefined,
        relatedEntityId: tx.relatedEntityId || undefined,
        createdAt: tx.createdAt.toISOString(),
        // Note: We don't have balanceAfter in the current schema
        // but we'll include it as undefined for future compatibility
        balanceAfter: undefined,
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
  } catch (error: any) {
    console.error('Error fetching wallet transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
