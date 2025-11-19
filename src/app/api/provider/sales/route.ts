import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/provider/sales
 *
 * Listar ventas (compras completadas de productos del proveedor).
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - status: 'completed' | 'refunded'
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
 *       "id": "purchase_123",
 *       "productId": "prod_456",
 *       "productName": "Netflix Premium",
 *       "productCategory": "netflix",
 *       "buyerId": "user_789",
 *       "buyerEmail": "buyer@example.com",
 *       "buyerName": "John Doe",
 *       "amount": "15.99",
 *       "providerEarnings": "15.19",
 *       "adminCommission": "0.80",
 *       "commissionRate": "0.05",
 *       "status": "completed",
 *       "completedAt": "2025-11-15T10:30:00Z",
 *       "createdAt": "2025-11-15T10:30:00Z"
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '10', 10),
      50
    );
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // 4. Build where clause
    const where: any = {
      providerId: user.id,
    };

    if (status) {
      where.status = status;
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

    // 5. Get total count
    const total = await prisma.purchase.count({ where });

    // 6. Get purchases with pagination
    const purchases = await prisma.purchase.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        dispute: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // 7. Transform to response format
    const data = purchases.map((purchase: any) => ({
      id: purchase.id,
      productId: purchase.productId,
      productName: purchase.product.name,
      productCategory: purchase.product.category,
      buyerId: purchase.sellerId,
      buyerEmail: purchase.seller.email,
      buyerName: purchase.seller.name || undefined,
      amount: purchase.amount.toString(),
      providerEarnings: purchase.providerEarnings.toString(),
      adminCommission: purchase.adminCommission.toString(),
      commissionRate: purchase.commissionRate.toString(),
      status: purchase.status,
      completedAt: purchase.completedAt?.toISOString(),
      refundedAt: purchase.refundedAt?.toISOString(),
      createdAt: purchase.createdAt.toISOString(),
      dispute: purchase.dispute ? {
        id: purchase.dispute.id,
        status: purchase.dispute.status,
      } : undefined,
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
    console.error('Error fetching provider sales:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
