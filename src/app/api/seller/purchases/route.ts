import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaWalletRepository } from '@/infrastructure/repositories/PrismaWalletRepository';
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository';
import { PrismaPurchaseRepository } from '@/infrastructure/repositories/PrismaPurchaseRepository';
import { PurchaseProductUseCase } from '@/application/use-cases/PurchaseProductUseCase';
import { verifyJWT } from '@/infrastructure/auth/jwt';

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
      sellerId: user.id,
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

    // If category filter, we need to join with product
    if (category) {
      where.product = {
        category,
      };
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
        product: true,
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 7. Transform to response format
    const data = purchases.map((purchase) => ({
      id: purchase.id,
      sellerId: purchase.sellerId,
      productId: purchase.productId,
      providerId: purchase.providerId,
      amount: purchase.amount.toString(),
      status: purchase.status,
      createdAt: purchase.createdAt.toISOString(),
      completedAt: purchase.completedAt?.toISOString(),
      refundedAt: purchase.refundedAt?.toISOString(),
      product: {
        id: purchase.product.id,
        category: purchase.product.category,
        name: purchase.product.name,
        description: purchase.product.description || '',
        // Only show credentials if purchase is completed
        accountEmail:
          purchase.status === 'completed'
            ? purchase.product.accountEmail
            : '***',
        accountPassword:
          purchase.status === 'completed'
            ? purchase.product.accountPassword
            : '***',
        accountDetails: purchase.product.accountDetails,
      },
      provider: {
        id: purchase.provider.id,
        name: purchase.provider.name || purchase.provider.email,
        email: purchase.provider.email,
      },
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

    const purchaseUseCase = new PurchaseProductUseCase(
      walletRepository,
      productRepository,
      purchaseRepository
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
