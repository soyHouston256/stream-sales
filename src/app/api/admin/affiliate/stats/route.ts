import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/admin/affiliate/stats
 *
 * Get platform-wide affiliate program statistics.
 * Requires authentication and admin role.
 *
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'year' | 'all' (default: 'all')
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "overview": {
 *     "totalAffiliates": 150,
 *     "activeAffiliates": 120,
 *     "pendingApplications": 15,
 *     "rejectedApplications": 10,
 *     "suspendedAffiliates": 5
 *   },
 *   "earnings": {
 *     "totalEarnings": "125000.00",
 *     "totalPaid": "100000.00",
 *     "totalPending": "25000.00",
 *     "averageEarningsPerAffiliate": "833.33"
 *   },
 *   "referrals": {
 *     "totalReferrals": 2500,
 *     "activeReferrals": 2100,
 *     "inactiveReferrals": 400,
 *     "averageReferralsPerAffiliate": "16.67",
 *     "conversionRate": "84.00"
 *   },
 *   "tiers": {
 *     "bronze": { "count": 80, "totalEarnings": "20000.00" },
 *     "silver": { "count": 45, "totalEarnings": "35000.00" },
 *     "gold": { "count": 20, "totalEarnings": "50000.00" },
 *     "platinum": { "count": 5, "totalEarnings": "20000.00" }
 *   },
 *   "performance": {
 *     "topAffiliates": [
 *       {
 *         "id": "prof_123",
 *         "userId": "user_456",
 *         "userName": "John Doe",
 *         "referralCode": "AFF-ABC12",
 *         "tier": "platinum",
 *         "totalEarnings": "5000.00",
 *         "totalReferrals": 100,
 *         "activeReferrals": 95
 *       }
 *     ]
 *   },
 *   "trends": {
 *     "newAffiliatesThisMonth": 12,
 *     "newReferralsThisMonth": 250,
 *     "earningsThisMonth": "12500.00",
 *     "growthRate": "15.50"
 *   }
 * }
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    // 4. Calculate date range based on period
    const now = new Date();
    let dateFrom: Date | undefined;

    switch (period) {
      case 'today':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        dateFrom = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        dateFrom = undefined;
    }

    // 5. Build where clause for period
    const periodWhere: any = {};
    if (dateFrom) {
      periodWhere.createdAt = { gte: dateFrom };
    }

    // 6. Get all affiliate profiles
    const allProfiles = await prisma.affiliateProfile.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // 7. Calculate overview statistics
    const totalAffiliates = allProfiles.length;
    const activeAffiliates = allProfiles.filter(
      (p) => p.status === 'active' || p.status === 'approved'
    ).length;
    const pendingApplications = allProfiles.filter((p) => p.status === 'pending').length;
    const rejectedApplications = allProfiles.filter((p) => p.status === 'rejected').length;
    const suspendedAffiliates = allProfiles.filter((p) => p.status === 'suspended').length;

    // 8. Calculate earnings statistics
    const totalEarnings = allProfiles.reduce(
      (sum, p) => sum + parseFloat(p.totalEarnings.toString()),
      0
    );
    const totalPaid = allProfiles.reduce(
      (sum, p) => sum + parseFloat(p.paidBalance.toString()),
      0
    );
    const totalPending = allProfiles.reduce(
      (sum, p) => sum + parseFloat(p.pendingBalance.toString()),
      0
    );
    const averageEarningsPerAffiliate =
      totalAffiliates > 0 ? totalEarnings / totalAffiliates : 0;

    // 9. Calculate referral statistics
    const totalReferrals = allProfiles.reduce((sum, p) => sum + p.totalReferrals, 0);
    const activeReferrals = allProfiles.reduce((sum, p) => sum + p.activeReferrals, 0);
    const inactiveReferrals = totalReferrals - activeReferrals;
    const averageReferralsPerAffiliate =
      totalAffiliates > 0 ? totalReferrals / totalAffiliates : 0;
    const conversionRate =
      totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0;

    // 10. Calculate tier distribution
    const tiers = {
      bronze: {
        count: allProfiles.filter((p) => p.tier === 'bronze').length,
        totalEarnings: allProfiles
          .filter((p) => p.tier === 'bronze')
          .reduce((sum, p) => sum + parseFloat(p.totalEarnings.toString()), 0)
          .toFixed(2),
      },
      silver: {
        count: allProfiles.filter((p) => p.tier === 'silver').length,
        totalEarnings: allProfiles
          .filter((p) => p.tier === 'silver')
          .reduce((sum, p) => sum + parseFloat(p.totalEarnings.toString()), 0)
          .toFixed(2),
      },
      gold: {
        count: allProfiles.filter((p) => p.tier === 'gold').length,
        totalEarnings: allProfiles
          .filter((p) => p.tier === 'gold')
          .reduce((sum, p) => sum + parseFloat(p.totalEarnings.toString()), 0)
          .toFixed(2),
      },
      platinum: {
        count: allProfiles.filter((p) => p.tier === 'platinum').length,
        totalEarnings: allProfiles
          .filter((p) => p.tier === 'platinum')
          .reduce((sum, p) => sum + parseFloat(p.totalEarnings.toString()), 0)
          .toFixed(2),
      },
    };

    // 11. Get top performing affiliates
    const topAffiliates = allProfiles
      .filter((p) => p.status === 'active' || p.status === 'approved')
      .sort((a, b) => {
        const earningsA = parseFloat(a.totalEarnings.toString());
        const earningsB = parseFloat(b.totalEarnings.toString());
        return earningsB - earningsA;
      })
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        userId: p.userId,
        userName: p.user.name || 'Unknown',
        userEmail: p.user.email,
        referralCode: p.referralCode,
        tier: p.tier,
        totalEarnings: p.totalEarnings.toString(),
        totalReferrals: p.totalReferrals,
        activeReferrals: p.activeReferrals,
      }));

    // 12. Calculate trends for this month
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newAffiliatesThisMonth = allProfiles.filter(
      (p) => p.createdAt >= firstDayOfMonth
    ).length;

    // Get affiliations created this month
    const affiliationsThisMonth = await prisma.affiliation.findMany({
      where: {
        createdAt: { gte: firstDayOfMonth },
      },
    });
    const newReferralsThisMonth = affiliationsThisMonth.length;

    const earningsThisMonth = affiliationsThisMonth
      .filter((aff) => aff.commissionAmount !== null)
      .reduce((sum, aff) => sum + parseFloat(aff.commissionAmount!.toString()), 0);

    // Calculate growth rate (compare to previous month)
    const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const affiliationsPrevMonth = await prisma.affiliation.findMany({
      where: {
        createdAt: {
          gte: firstDayOfPrevMonth,
          lte: lastDayOfPrevMonth,
        },
      },
    });

    const earningsPrevMonth = affiliationsPrevMonth
      .filter((aff) => aff.commissionAmount !== null)
      .reduce((sum, aff) => sum + parseFloat(aff.commissionAmount!.toString()), 0);

    const growthRate =
      earningsPrevMonth > 0
        ? ((earningsThisMonth - earningsPrevMonth) / earningsPrevMonth) * 100
        : 0;

    // 13. Return comprehensive statistics
    return NextResponse.json({
      overview: {
        totalAffiliates,
        activeAffiliates,
        pendingApplications,
        rejectedApplications,
        suspendedAffiliates,
      },
      earnings: {
        totalEarnings: totalEarnings.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalPending: totalPending.toFixed(2),
        averageEarningsPerAffiliate: averageEarningsPerAffiliate.toFixed(2),
      },
      referrals: {
        totalReferrals,
        activeReferrals,
        inactiveReferrals,
        averageReferralsPerAffiliate: averageReferralsPerAffiliate.toFixed(2),
        conversionRate: conversionRate.toFixed(2),
      },
      tiers,
      performance: {
        topAffiliates,
      },
      trends: {
        newAffiliatesThisMonth,
        newReferralsThisMonth,
        earningsThisMonth: earningsThisMonth.toFixed(2),
        growthRate: growthRate.toFixed(2),
      },
    });
  } catch (error: any) {
    console.error('Error fetching affiliate statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
