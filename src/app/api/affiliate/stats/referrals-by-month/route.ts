import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/affiliate/stats/referrals-by-month
 *
 * Get referrals grouped by month for chart display.
 * Requires authentication and affiliate profile.
 *
 * Query params:
 * - months: number (default: 6) - Number of months to retrieve
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * [
 *   { "month": "2025-10", "count": 5 },
 *   { "month": "2025-11", "count": 8 },
 *   ...
 * ]
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

    // 2. Get query params
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6', 10);

    // 3. Check affiliate profile exists
    const affiliateProfile = await prisma.affiliateProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!affiliateProfile) {
      return NextResponse.json(
        { error: 'No affiliate profile found' },
        { status: 404 }
      );
    }

    // 4. Calculate date range (last N months)
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // 5. Get all affiliations in the date range
    const affiliations = await prisma.affiliation.findMany({
      where: {
        affiliateId: payload.userId,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 6. Group by month
    const monthlyData: { [key: string]: number } = {};

    // Initialize all months with 0
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = 0;
    }

    // Count affiliations per month
    affiliations.forEach((affiliation) => {
      const date = new Date(affiliation.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey]++;
      }
    });

    // 7. Convert to array and sort by month
    const result = Object.entries(monthlyData)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 8. Return data
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching referrals by month:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
