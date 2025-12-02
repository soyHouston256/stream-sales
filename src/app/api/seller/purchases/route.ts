import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaWalletRepository } from '@/infrastructure/repositories/PrismaWalletRepository';
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository';
import { PrismaPurchaseRepository } from '@/infrastructure/repositories/PrismaPurchaseRepository';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { PrismaCommissionConfigRepository } from '@/infrastructure/repositories/PrismaCommissionConfigRepository';
import { PurchaseProductUseCase } from '@/application/use-cases/PurchaseProductUseCase';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { computeEffectiveFields } from '@/lib/utils/purchase-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seller/purchases
 *
 * Listar compras del vendedor.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - category: ProductCategory
 * - status: PurchaseStatus
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
 *       "sellerId": "user_456",
 *       "productId": "prod_789",
 *       "providerId": "provider_012",
 *       "amount": "15.99",
 *       "status": "completed",
 *       "createdAt": "2025-11-15T10:30:00Z",
 *       "completedAt": "2025-11-15T10:30:01Z",
 *       "product": {
 *         "id": "prod_789",
 *         "category": "netflix",
 *         "name": "Netflix Premium",
 *         "description": "4K Ultra HD",
 *         "accountEmail": "***",
 *         "accountPassword": "***"
 *       },
 *       "provider": {
 *         "id": "provider_012",
 *         "name": "John Doe",
 *         "email": "john@example.com"
 *       }
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '10', 10),
      50
    );
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // 4. Build where clause
    const where: any = {
      order: {
        userId: user.id, // Vendedor es el comprador
      },
    };

    if (status) {
      where.order = { status };
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

    if (category) {
      where.variant = {
        product: {
          ...where.variant.product,
          category,
        },
      };
    }

    // 5. Get total count
    const total = await prisma.orderItem.count({ where });

    // 6. Get purchases with pagination
    const orderItems = await prisma.orderItem.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { order: { createdAt: 'desc' } },
      include: {
        order: {
          include: {
            user: { // Buyer
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        variant: {
          include: {
            product: {
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 7. Transform to response format
    const data = orderItems.map((item: any) => {
      const purchaseStatus = item.order.status;
      const amount = item.variant.price;

      // Note: Disputes are temporarily disabled due to schema refactor
      const dispute = undefined;

      const { effectiveStatus, effectiveAmount } = computeEffectiveFields({
        status: purchaseStatus,
        amount: amount,
        dispute: dispute,
      });

      return {
        id: item.id, // Using OrderItem ID as Purchase ID
        sellerId: item.order.user.id, // The buyer
        productId: item.variant.productId,
        providerId: item.variant.product.providerId,
        amount: amount.toString(),
        status: purchaseStatus,
        createdAt: item.order.createdAt.toISOString(),
        completedAt: item.order.status === 'paid' ? item.order.createdAt.toISOString() : undefined,
        refundedAt: undefined,
        // Computed fields
        effectiveStatus,
        effectiveAmount,
        // Dispute info
        dispute: undefined,
        product: {
          id: item.variant.product.id,
          category: item.variant.product.category,
          name: item.variant.product.name,
          description: item.variant.product.description || '',
          // Only show credentials if purchase is completed
          accountEmail:
            effectiveStatus === 'completed' || effectiveStatus === 'disputed'
              ? item.variant.product.accountEmail || '***' // Schema might not have accountEmail on Product anymore? Check schema.
              : '***',
          accountPassword:
            effectiveStatus === 'completed' || effectiveStatus === 'disputed'
              ? item.variant.product.accountPassword || '***'
              : '***',
          accountDetails: {},
        },
        provider: {
          id: item.variant.product.provider.id,
          name: item.variant.product.provider.name || item.variant.product.provider.email,
          email: item.variant.product.provider.email,
        },
      };
    });

    // 8. Calculate total effective spent
    // Fetch all paid items for this user to sum them up.
    // Since price is on ProductVariant, we need to include it.
    const allPaidItems = await prisma.orderItem.findMany({
      where: {
        order: {
          userId: user.id,
          status: 'paid',
        },
      },
      include: {
        variant: {
          select: {
            price: true,
          },
        },
      },
    });

    const totalEffectiveSpent = allPaidItems.reduce(
      (sum: number, item: any) => sum + Number(item.variant.price),
      0
    );

    // 9. Return paginated response with global stats
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalEffectiveSpent: totalEffectiveSpent.toFixed(2),
      },
    });
  } catch (error: any) {
    console.error('Error fetching seller purchases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seller/purchases
 *
 * Comprar un producto del marketplace.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Request Body:
 * {
 *   "productId": "prod_123"
 * }
 *
 * Response 201:
 * {
 *   "id": "purchase_456",
 *   "sellerId": "user_789",
 *   "productId": "prod_123",
 *   "providerId": "provider_012",
 *   "amount": "15.99",
 *   "status": "completed",
 *   "createdAt": "2025-11-15T10:30:00Z",
 *   "completedAt": "2025-11-15T10:30:01Z",
 *   "product": {
 *     "id": "prod_123",
 *     "category": "netflix",
 *     "name": "Netflix Premium",
 *     "description": "4K Ultra HD",
 *     "accountEmail": "account@netflix.com",
 *     "accountPassword": "password123",
 *     "accountDetails": {}
 *   },
 *   "provider": {
 *     "id": "provider_012",
 *     "name": "John Doe",
 *     "email": "john@example.com"
 *   }
 * }
 */
const purchaseSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export async function POST(request: NextRequest) {
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

    // 3. Validate request body
    const body = await request.json();
    const validationResult = purchaseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { productId } = validationResult.data;

    // 4. Execute purchase use case
    const walletRepository = new PrismaWalletRepository(prisma);
    const productRepository = new PrismaProductRepository(prisma);
    const purchaseRepository = new PrismaPurchaseRepository(prisma);
    const userRepository = new PrismaUserRepository();
    const commissionConfigRepository = new PrismaCommissionConfigRepository(prisma);

    const purchaseUseCase = new PurchaseProductUseCase(
      walletRepository,
      productRepository,
      purchaseRepository,
      userRepository,
      commissionConfigRepository
    );

    const result = await purchaseUseCase.execute({
      sellerId: user.id,
      productId,
    });

    // 5. Return purchase result
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating purchase:', error);

    // Handle specific domain errors
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error.message.includes('insufficient') ||
      error.message.includes('balance')
    ) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }

    if (
      error.message.includes('not available') ||
      error.message.includes('already sold')
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
