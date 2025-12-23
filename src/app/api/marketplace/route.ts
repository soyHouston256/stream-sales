import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';

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

    // 2. Build where clause - only show active products
    const where: any = {
      isActive: true,
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

    // 3. Get total count
    const total = await prisma.product.count({ where });

    // 3.5 Get pricing config for markup
    const pricingConfig = await prisma.pricingConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    const distributorMarkup = pricingConfig ? parseFloat(pricingConfig.distributorMarkup.toString()) : 0;
    const distributorMarkupType = pricingConfig?.distributorMarkupType || 'percentage';

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
        variants: {
          take: 1,
          orderBy: { price: 'asc' },
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

    // 5. Transform to response format (hide sensitive data) with markup applied
    const data = products.map((product: any) => {
      const account = product.inventoryAccounts[0];
      const totalSlots = account?.totalSlots || 1;
      const availableSlots = account?.availableSlots || 0;
      // 'profile' if multiple slots, 'full' if single slot
      const accountType = totalSlots > 1 ? 'profile' : 'full';

      // Apply markup based on type
      const basePrice = parseFloat(product.variants[0]?.price.toString() || '0');
      let displayPrice: number;
      if (distributorMarkupType === 'percentage') {
        displayPrice = basePrice * (1 + distributorMarkup / 100);
      } else {
        displayPrice = basePrice + distributorMarkup; // Fixed amount
      }

      return {
        id: product.id,
        providerId: product.providerId,
        providerName: product.provider.name || product.provider.email.split('@')[0],
        category: product.category,
        name: product.name,
        description: product.description,
        price: displayPrice.toFixed(2), // Price WITH markup
        durationDays: product.variants[0]?.durationDays ?? 0,
        imageUrl: product.imageUrl,
        accountType,
        totalSlots,
        availableSlots,
        createdAt: product.createdAt.toISOString(),
      };
    });

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
  } catch (error: unknown) {
    console.error('Error fetching marketplace products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
