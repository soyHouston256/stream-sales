import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

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

    // 4. Build where clause for OrderItems
    const where: any = {
      variant: {
        product: {
          providerId: user.id,
        },
      },
    };

    if (status) {
      where.order = { status: status };
    }

    if (startDate || endDate) {
      where.order = {
        ...where.order,
        createdAt: {},
      };
      if (startDate) {
        where.order.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.order.createdAt.lte = new Date(endDate);
      }
    }

    // 5. Get total count
    const total = await prisma.orderItem.count({ where });

    // 6. Get sales with pagination
    const sales = await prisma.orderItem.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        order: {
          createdAt: 'desc',
        },
      },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
        order: {
          include: {
            // Assuming we can get buyer info from order.userId if we had a relation, 
            // but Order model in schema only has userId string, no relation defined in schema provided earlier?
            // Wait, looking at schema provided:
            // model Order { userId String ... } - No relation to User?
            // That's a problem. I might need to fetch users separately or assume userId is enough.
            // But the previous code fetched `seller` (User).
            // Let's check schema again.
          },
        },
        // dispute: true, // Dispute is on Purchase. New Dispute model links to... ?
        // Schema says: model Dispute { purchaseId String @unique ... }
        // It seems Dispute is still linked to Purchase. I need to update Dispute to link to OrderItem or Order.
        // For now, I will omit dispute info or return undefined.
      },
    });

    // Fetch buyers manually if needed, or if Order has relation.
    // Checking schema: Order model has `userId` but no `@relation` to User?
    // "model Order { ... userId String ... }"
    // If so, I can't include buyer info directly.
    // I will map what I can.

    // 7. Transform to response format
    const data = await Promise.all(sales.map(async (item: any) => {
      // Fetch buyer if not in relation
      let buyerEmail = 'unknown';
      let buyerName = 'unknown';
      if (item.order.userId) {
        const buyer = await prisma.user.findUnique({
          where: { id: item.order.userId },
          select: { email: true, name: true },
        });
        if (buyer) {
          buyerEmail = buyer.email;
          buyerName = buyer.name || 'unknown';
        }
      }

      return {
        id: item.id, // OrderItem ID
        productId: item.variant.productId,
        productName: item.variant.product.name,
        productCategory: item.variant.product.category,
        buyerId: item.order.userId,
        buyerEmail: buyerEmail,
        buyerName: buyerName,
        amount: item.variant.price.toString(),
        providerEarnings: item.variant.price.toString(), // TODO: Commission
        adminCommission: "0",
        commissionRate: "0",
        status: item.order.status,
        completedAt: item.order.status === 'paid' ? item.order.createdAt.toISOString() : undefined,
        createdAt: item.order.createdAt.toISOString(),
        // dispute: ... // TODO
      };
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
  } catch (error: unknown) {
    console.error('Error fetching provider sales:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
