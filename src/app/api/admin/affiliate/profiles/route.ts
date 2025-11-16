import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/admin/affiliate/profiles
 *
 * List all affiliate profiles with detailed information and statistics.
 * Requires authentication and admin role.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 50)
 * - status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'active'
 * - tier: 'bronze' | 'silver' | 'gold' | 'platinum'
 * - search: string (search by name, email, or referral code)
 * - sortBy: 'createdAt' | 'totalEarnings' | 'totalReferrals' | 'activeReferrals'
 * - sortOrder: 'asc' | 'desc'
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "data": [
 *     {
 *       "id": "prof_123",
 *       "userId": "user_456",
 *       "user": {
 *         "id": "user_456",
 *         "name": "John Doe",
 *         "email": "john@example.com",
 *         "role": "seller"
 *       },
 *       "referralCode": "AFF-ABC12",
 *       "referralLink": "https://app.com/register?ref=AFF-ABC12",
 *       "status": "active",
 *       "tier": "gold",
 *       "totalEarnings": "1250.50",
 *       "pendingBalance": "125.00",
 *       "paidBalance": "1125.50",
 *       "totalReferrals": 45,
 *       "activeReferrals": 38,
 *       "conversionRate": "84.44",
 *       "averageCommissionPerReferral": "27.79",
 *       "approvedBy": "admin_789",
 *       "approvedAt": "2025-11-15T10:30:00Z",
 *       "createdAt": "2025-11-10T08:00:00Z",
 *       "updatedAt": "2025-11-16T12:00:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 45,
 *     "totalPages": 5
 *   },
 *   "summary": {
 *     "totalAffiliates": 100,
 *     "activeAffiliates": 75,
 *     "totalEarningsPaid": "125000.00",
 *     "pendingPayments": "12500.00",
 *     "totalReferrals": 2500,
 *     "activeReferrals": 2100
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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    const status = searchParams.get('status') || undefined;
    const tier = searchParams.get('tier') || undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // 4. Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (tier) {
      where.tier = tier;
    }

    // 5. Build order by clause
    let orderBy: any = {};
    if (sortBy === 'totalEarnings' || sortBy === 'totalReferrals' || sortBy === 'activeReferrals') {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // 6. Get total count
    const total = await prisma.affiliateProfile.count({ where });

    // 7. Get affiliate profiles with user data
    let affiliateProfiles = await prisma.affiliateProfile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // 8. Filter by search if specified
    if (search) {
      const searchLower = search.toLowerCase();
      affiliateProfiles = affiliateProfiles.filter(
        (profile: any) =>
          profile.user.name?.toLowerCase().includes(searchLower) ||
          profile.user.email.toLowerCase().includes(searchLower) ||
          profile.referralCode.toLowerCase().includes(searchLower)
      );
    }

    // 9. Calculate summary statistics
    const allProfiles = await prisma.affiliateProfile.findMany();
    const activeProfiles = allProfiles.filter((p: any) => p.status === 'active' || p.status === 'approved');

    const totalEarningsPaid = allProfiles.reduce(
      (sum: number, p: any) => sum + parseFloat(p.paidBalance.toString()),
      0
    );
    const pendingPayments = allProfiles.reduce(
      (sum: number, p: any) => sum + parseFloat(p.pendingBalance.toString()),
      0
    );
    const totalReferrals = allProfiles.reduce((sum: number, p: any) => sum + p.totalReferrals, 0);
    const activeReferrals = allProfiles.reduce((sum: number, p: any) => sum + p.activeReferrals, 0);

    // 10. Get base URL for referral links
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';

    // 11. Transform to response format with calculated metrics
    const data = affiliateProfiles.map((profile: any) => {
      const conversionRate =
        profile.totalReferrals > 0
          ? ((profile.activeReferrals / profile.totalReferrals) * 100).toFixed(2)
          : '0.00';

      const averageCommissionPerReferral =
        profile.totalReferrals > 0
          ? (parseFloat(profile.totalEarnings.toString()) / profile.totalReferrals).toFixed(2)
          : '0.00';

      return {
        id: profile.id,
        userId: profile.userId,
        user: {
          id: profile.user.id,
          name: profile.user.name || 'Unknown',
          email: profile.user.email,
          role: profile.user.role,
        },
        referralCode: profile.referralCode,
        referralLink: `${baseUrl}/register?ref=${profile.referralCode}`,
        status: profile.status,
        tier: profile.tier,
        totalEarnings: profile.totalEarnings.toString(),
        pendingBalance: profile.pendingBalance.toString(),
        paidBalance: profile.paidBalance.toString(),
        totalReferrals: profile.totalReferrals,
        activeReferrals: profile.activeReferrals,
        conversionRate,
        averageCommissionPerReferral,
        applicationNote: profile.applicationNote,
        rejectionReason: profile.rejectionReason,
        approvedBy: profile.approvedBy,
        approvedAt: profile.approvedAt?.toISOString(),
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      };
    });

    // 12. Return paginated response with summary
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: search ? data.length : total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAffiliates: allProfiles.length,
        activeAffiliates: activeProfiles.length,
        totalEarningsPaid: totalEarningsPaid.toFixed(2),
        pendingPayments: pendingPayments.toFixed(2),
        totalReferrals,
        activeReferrals,
      },
    });
  } catch (error: any) {
    console.error('Error fetching affiliate profiles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
