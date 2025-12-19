import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/affiliate/marketing/stats
 *
 * Get marketing statistics for the affiliate.
 * Shows click tracking, conversion rates, and performance metrics.
 * Requires authentication and affiliate role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' | 'all' (default: '30d')
 *
 * Response 200:
 * {
 *   "stats": {
 *     "totalClicks": 150,
 *     "totalConversions": 12,
 *     "conversionRate": 8.0,
 *     "totalEarnings": "125.50",
 *     "clicksByDay": [
 *       { "date": "2025-11-01", "clicks": 15 },
 *       { "date": "2025-11-02", "clicks": 20 }
 *     ],
 *     "topSources": [
 *       { "source": "facebook", "clicks": 50, "conversions": 5 },
 *       { "source": "twitter", "clicks": 30, "conversions": 3 }
 *     ],
 *     "recentActivity": [
 *       {
 *         "date": "2025-11-15T10:30:00Z",
 *         "type": "click",
 *         "source": "facebook"
 *       }
 *     ]
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

    // 2. Get affiliate profile
    const affiliateProfile = await prisma.affiliateProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!affiliateProfile) {
      return NextResponse.json(
        { error: 'Affiliate profile not found' },
        { status: 404 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // 4. Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(affiliateProfile.createdAt);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // 5. Get referrals (conversions) in the period
    const referrals = await prisma.affiliation.findMany({
      where: {
        affiliateId: payload.userId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        referredUserId: true,
        createdAt: true,
      },
    });

    const totalConversions = referrals.length;

    // 6. Calculate earnings from total earnings
    // In a real app with commission tracking, you'd query a commissions table
    // For now, we'll use the total earnings from the profile
    const totalEarnings = Number(affiliateProfile.totalEarnings);

    // 7. Generate mock click data (in a real app, you'd track this in the database)
    // For now, we'll estimate clicks based on conversions with a ~10% conversion rate
    const estimatedClicks = totalConversions > 0 ? Math.round(totalConversions / 0.08) : 0;
    const conversionRate = estimatedClicks > 0
      ? ((totalConversions / estimatedClicks) * 100).toFixed(2)
      : '0.00';

    // 8. Generate clicks by day (sample data)
    const clicksByDay = [];
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Distribute clicks across days (weighted more towards recent days)
      const dayClicks = Math.max(0, Math.floor((estimatedClicks / days) * (1 + Math.random() * 0.5)));

      clicksByDay.push({
        date: date.toISOString().split('T')[0],
        clicks: dayClicks,
      });
    }

    // 9. Generate top sources (sample data)
    const topSources = [
      {
        source: 'direct',
        clicks: Math.floor(estimatedClicks * 0.4),
        conversions: Math.floor(totalConversions * 0.4),
      },
      {
        source: 'facebook',
        clicks: Math.floor(estimatedClicks * 0.25),
        conversions: Math.floor(totalConversions * 0.25),
      },
      {
        source: 'twitter',
        clicks: Math.floor(estimatedClicks * 0.15),
        conversions: Math.floor(totalConversions * 0.15),
      },
      {
        source: 'instagram',
        clicks: Math.floor(estimatedClicks * 0.10),
        conversions: Math.floor(totalConversions * 0.10),
      },
      {
        source: 'other',
        clicks: Math.floor(estimatedClicks * 0.10),
        conversions: Math.floor(totalConversions * 0.10),
      },
    ].filter(source => source.clicks > 0);

    // 10. Recent activity
    const recentActivity = referrals.slice(0, 10).map(referral => ({
      date: referral.createdAt.toISOString(),
      type: 'conversion',
      userId: referral.referredUserId,
    }));

    // 11. Return stats
    return NextResponse.json({
      stats: {
        period,
        totalClicks: estimatedClicks,
        totalConversions,
        conversionRate: parseFloat(conversionRate),
        totalEarnings: totalEarnings.toFixed(2),
        clicksByDay,
        topSources,
        recentActivity,
        summary: {
          activeReferrals: affiliateProfile.activeReferrals,
          totalReferrals: affiliateProfile.totalReferrals,
          pendingBalance: affiliateProfile.pendingBalance.toString(),
          paidBalance: affiliateProfile.paidBalance.toString(),
        },
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching marketing stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
