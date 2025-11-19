import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/admin/commissions/history
 *
 * Get commission configuration history.
 * Returns all commission config changes ordered by date.
 * Requires authentication and admin role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * [
 *   {
 *     "id": "config_123",
 *     "saleCommission": 5.50,
 *     "registrationCommission": 10.00,
 *     "updatedBy": "admin@example.com",
 *     "createdAt": "2025-11-16T10:30:00Z",
 *     "effectiveFrom": "2025-11-16T10:30:00Z",
 *     "isActive": true
 *   }
 * ]
 */

export async function GET(request: NextRequest) {
  try {
    // 1. Verify JWT token and admin role
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

    // 2. Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // 3. Get all commission configs ordered by creation date
    const configs = await prisma.commissionConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 4. Group configs by effectiveFrom to pair sale and registration configs
    const groupedConfigs = new Map<string, any>();

    configs.forEach((config: any) => {
      const key = config.effectiveFrom.toISOString();

      if (!groupedConfigs.has(key)) {
        groupedConfigs.set(key, {
          effectiveFrom: config.effectiveFrom,
          createdAt: config.createdAt,
          isActive: config.isActive,
          saleCommission: null,
          registrationCommission: null,
        });
      }

      const group = groupedConfigs.get(key);

      if (config.type === 'sale') {
        group.saleCommission = parseFloat(config.rate.toString());
      } else if (config.type === 'registration') {
        group.registrationCommission = parseFloat(config.rate.toString());
      }
    });

    // 5. Convert map to array and sort by date
    const history = Array.from(groupedConfigs.values())
      .map((item, index) => ({
        id: `config_${index}`,
        saleCommission: item.saleCommission ?? 0,
        registrationCommission: item.registrationCommission ?? 0,
        updatedBy: user.email, // We don't store who updated, so showing current admin
        createdAt: item.createdAt.toISOString(),
        effectiveFrom: item.effectiveFrom.toISOString(),
        isActive: item.isActive,
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    // 6. Return history
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error fetching commission history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
