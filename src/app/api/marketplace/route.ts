import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';

/**
 * GET /api/marketplace
 *
 * Endpoint público para listar productos disponibles en el marketplace.
 * No requiere autenticación.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 12, max: 50)
 * - category: ProductCategory[]
 * - maxPrice: number
 * - search: string
 *
 * Response 200:
 * {
 *   "data": [
 *     {
 *       "id": "prod_123",
 *       "providerId": "user_456",
 *       "providerName": "John Doe",
 *       "category": "netflix",
 *       "name": "Netflix Premium",
 *       "description": "4K Ultra HD, 4 screens",
 *       "price": "15.99",
 *       "createdAt": "2025-11-15T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 12,
 *     "total": 45,
 *     "totalPages": 4
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '12', 10),
      50
    );
    const categories = searchParams.getAll('category');
    const maxPrice = searchParams.get('maxPrice')
      ? parseFloat(searchParams.get('maxPrice')!)
      : undefined;
    const search = searchParams.get('search') || undefined;

    // 2. Build where clause - only show available products
    const where: any = {
      status: 'available',
    };

    if (categories.length > 0) {
      where.category = { in: categories };
    }

    if (maxPrice !== undefined) {
      where.price = { lte: maxPrice };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 3. Get total count
    const total = await prisma.product.count({ where });

    // 4. Get products with pagination
    const products = await prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 5. Transform to response format (hide sensitive data)
    const data = products.map((product) => ({
      id: product.id,
      providerId: product.providerId,
      providerName: product.provider.name || product.provider.email.split('@')[0],
      category: product.category,
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      imageUrl: product.imageUrl,
      createdAt: product.createdAt.toISOString(),
    }));

    // 6. Return paginated response
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
    console.error('Error fetching marketplace products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
