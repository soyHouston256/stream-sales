import { NextRequest, NextResponse } from 'next/server';
import { prisma as globalPrisma } from '@/infrastructure/database/prisma';
import { PrismaClient } from '@prisma/client';
import { verifyJWT } from '@/infrastructure/auth/jwt';

// Define minimal OrderDelegate interface to fix type resolution
interface OrderDelegate {
  count(args?: { where?: any }): Promise<number>;
}

// Force type recognition for order delegate
const prisma = globalPrisma as unknown as PrismaClient & {
  order: OrderDelegate;
};

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 *
 * Obtener estadísticas generales del sistema (solo admin).
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "totalUsers": 150,
 *   "totalSales": 450,
 *   "totalCommissions": "2345.50",
 *   "activeDisputes": 5,
 *   "salesGrowth": 12.5,
 *   "usersGrowth": 8.3
 * }
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

    // 3. Get total users
    const totalUsers = await prisma.user.count();

    // 4. Get total sales (completed orders)
    const totalSales = await prisma.order.count({
      where: { status: 'paid' },
    });

    // 5. Get total commissions
    // TODO: Implement commission calculation using Transaction/Ledger system
    // As Order model doesn't store adminCommission directly anymore
    const totalCommissions = '0.00';

    // 6. Get active disputes (if table exists, otherwise return 0)
    // For now, return 0 as disputes table may not exist yet
    const activeDisputes = 0;

    // 7. Calculate growth metrics (last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Sales growth
    const recentSales = await prisma.order.count({
      where: {
        status: 'paid',
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const previousSales = await prisma.order.count({
      where: {
        status: 'paid',
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
    });

    const salesGrowth =
      previousSales > 0
        ? ((recentSales - previousSales) / previousSales) * 100
        : recentSales > 0
          ? 100
          : 0;

    // Users growth
    const recentUsers = await prisma.user.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const previousUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
    });

    const usersGrowth =
      previousUsers > 0
        ? ((recentUsers - previousUsers) / previousUsers) * 100
        : recentUsers > 0
          ? 100
          : 0;

    // 8. Return stats
    return NextResponse.json({
      totalUsers,
      totalSales,
      totalCommissions,
      activeDisputes,
      salesGrowth: parseFloat(salesGrowth.toFixed(2)),
      usersGrowth: parseFloat(usersGrowth.toFixed(2)),
    });
  } catch (error: unknown) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
