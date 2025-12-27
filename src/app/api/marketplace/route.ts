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
        inventoryLicenses: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // 5. Transform to response format (hide sensitive data) with markup applied
    const data = products.map((product: any) => {
      // Aggregate stock across ALL inventory accounts
      let totalFullAccounts = 0;
      let availableFullAccounts = 0;
      let totalProfileSlots = 0;
      let availableProfileSlots = 0;

      for (const account of product.inventoryAccounts) {
        if (account.totalSlots === 1) {
          // Full account
          totalFullAccounts += 1;
          availableFullAccounts += account.availableSlots;
        } else {
          // Profile-based account
          totalProfileSlots += account.totalSlots;
          availableProfileSlots += account.availableSlots;
        }
      }

      // Calculate license stock for license products
      const totalLicenses = product.inventoryLicenses?.length ?? 0;
      const availableLicenses = product.inventoryLicenses?.filter((l: any) => l.status === 'available').length ?? 0;

      // Total slots is sum of all (including licenses)
      const totalSlots = totalFullAccounts + totalProfileSlots + totalLicenses;
      const availableSlots = availableFullAccounts + availableProfileSlots + availableLicenses;

      // Determine account type based on majority
      const accountType = totalProfileSlots > totalFullAccounts ? 'profile' : 'full';

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
        deliveryDetails: product.deliveryDetails || [],
        accountType,
        totalSlots,
        availableSlots,
        // New detailed fields
        totalFullAccounts,
        availableFullAccounts,
        totalProfileSlots,
        availableProfileSlots,
        // License stock
        totalLicenses,
        availableLicenses,
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
