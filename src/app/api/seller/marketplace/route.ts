import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seller/marketplace
 *
 * Listar productos disponibles para compra en el marketplace.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 12, max: 50)
 * - category: ProductCategory[] (multiple values)
 * - maxPrice: number
 * - search: string (busca en name y description)
 *
 * Headers:
 * - Authorization: Bearer <token>
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
 *       "status": "available",
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
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de seller
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
      parseInt(searchParams.get('limit') || '12', 10),
      50
    );
    const categories = searchParams.getAll('category');
    const maxPrice = searchParams.get('maxPrice')
      ? parseFloat(searchParams.get('maxPrice')!)
      : undefined;
    const search = searchParams.get('search') || undefined;

    // 4. Build where clause
    const where: any = {
      isActive: true, // Solo productos activos
    };

    if (categories.length > 0) {
      where.category = { in: categories };
    }

    if (maxPrice !== undefined) {
      where.variants = {
        some: {
          price: { lte: maxPrice },
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 5. Get total count
    const total = await prisma.product.count({ where });

    // 6. Get products with pagination
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
        variants: {
          orderBy: { price: 'asc' },
          take: 1,
        },
        inventoryAccounts: {
          select: {
            id: true,
            totalSlots: true,
            availableSlots: true,
          },
        },
      },
    });

    // 7. Transform to response format
    const data = products.map((product: any) => {
      const account = product.inventoryAccounts[0];
      const totalSlots = account?.totalSlots || 1;
      const availableSlots = account?.availableSlots || 0;
      // Determine account type: 'full' if totalSlots is 1, 'profile' if more than 1
      const accountType = totalSlots > 1 ? 'profile' : 'full';

      return {
        id: product.id,
        providerId: product.providerId,
        providerName: product.provider.name || product.provider.email,
        category: product.category,
        name: product.name,
        description: product.description || '',
        price: product.variants[0]?.price.toString() || '0',
        durationDays: product.variants[0]?.durationDays ?? 0,
        imageUrl: product.imageUrl,
        status: product.isActive ? 'available' : 'unavailable',
        accountType, // 'full' or 'profile'
        totalSlots,
        availableSlots,
        createdAt: product.createdAt.toISOString(),
      };
    });

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
    console.error('Error fetching marketplace products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
