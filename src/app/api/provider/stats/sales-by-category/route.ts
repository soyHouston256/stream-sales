import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/provider/stats/sales-by-category
 *
 * Obtener ventas agrupadas por categoría para el proveedor.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * [
 *   {
 *     "category": "netflix",
 *     "count": 15,
 *     "totalAmount": "239.85",
 *     "totalEarnings": "227.86"
 *   }
 * ]
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de provider
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

    // 3. Get completed sales with product details (replacing purchases)
    const soldItems = await prisma.orderItem.findMany({
      where: {
        variant: {
          product: {
            providerId: user.id,
          },
        },
        order: {
          status: 'paid',
        },
      },
      include: {
        variant: {
          include: {
            product: {
              select: {
                category: true,
              },
            },
          },
        },
      },
    });

    // 4. Group by category
    const categoryMap = new Map<
      string,
      { count: number; totalAmount: number; totalEarnings: number }
    >();

    for (const item of soldItems) {
      const category = item.variant.product.category;
      const amount = item.variant.price.toNumber();
      const earnings = amount; // TODO: Handle commission

      const existing = categoryMap.get(category) || {
        count: 0,
        totalAmount: 0,
        totalEarnings: 0,
      };

      categoryMap.set(category, {
        count: existing.count + 1,
        totalAmount: existing.totalAmount + amount,
        totalEarnings: existing.totalEarnings + earnings,
      });
    }

    // 5. Convert to array and format
    const salesByCategory = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        count: data.count,
        totalAmount: data.totalAmount.toFixed(2),
        totalEarnings: data.totalEarnings.toFixed(2),
      })
    );

    // 6. Sort by count descending
    salesByCategory.sort((a, b) => b.count - a.count);

    // 7. Return data
    return NextResponse.json(salesByCategory);
  } catch (error: any) {
    console.error('Error fetching sales by category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
