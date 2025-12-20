import { NextRequest, NextResponse } from 'next/server';
import { prisma as globalPrisma } from '@/infrastructure/database/prisma';
import { PrismaClient } from '@prisma/client';
import { verifyJWT } from '@/infrastructure/auth/jwt';

// Define minimal OrderDelegate interface to fix type resolution
interface OrderDelegate {
  findMany(args?: {
    where?: any;
    select?: any;
    orderBy?: any;
  }): Promise<Array<{ createdAt: Date; totalAmount: any }>>;
}

// Force type recognition for order delegate
const prisma = globalPrisma as unknown as PrismaClient & {
  order: OrderDelegate;
};

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats/sales?days=7
 *
 * Obtener datos de ventas agrupados por día (solo admin).
 *
 * Query params:
 * - days: number (default: 7) - Número de días hacia atrás
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * [
 *   {
 *     "date": "2025-11-16",
 *     "sales": 15,
 *     "revenue": 234.50
 *   }
 * ]
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de admin
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

    // 2. Verify user has admin role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    // 4. Calculate date range
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 5. Get sales data
    const purchases = await prisma.order.findMany({
      where: {
        status: 'paid',
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 6. Group by date
    const salesByDate = new Map<string, { sales: number; revenue: number }>();

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      salesByDate.set(dateStr, { sales: 0, revenue: 0 });
    }

    // Aggregate sales
    for (const purchase of purchases) {
      const dateStr = purchase.createdAt.toISOString().split('T')[0];
      const existing = salesByDate.get(dateStr) || { sales: 0, revenue: 0 };
      salesByDate.set(dateStr, {
        sales: existing.sales + 1,
        revenue: existing.revenue + Number(purchase.totalAmount),
      });
    }

    // 7. Convert to array and sort by date
    const salesData = Array.from(salesByDate.entries())
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        revenue: parseFloat(data.revenue.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 8. Return data
    return NextResponse.json(salesData);
  } catch (error: unknown) {
    console.error('Error fetching sales data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
