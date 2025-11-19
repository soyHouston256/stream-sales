import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/admin/affiliate/applications
 *
 * List all affiliate applications with filters.
 * Requires authentication and admin role.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 50)
 * - status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'active'
 * - search: string (search by name, email, or referral code)
 * - dateFrom: ISO date string
 * - dateTo: ISO date string
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
 *       "status": "pending",
 *       "tier": "bronze",
 *       "applicationNote": "I want to promote...",
 *       "totalReferrals": 0,
 *       "activeReferrals": 0,
 *       "totalEarnings": "0.00",
 *       "createdAt": "2025-11-15T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 45,
 *     "totalPages": 5
 *   },
 *   "summary": {
 *     "pending": 15,
 *     "approved": 20,
 *     "rejected": 5,
 *     "active": 18,
 *     "suspended": 2
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
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    // 4. Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // 5. Get total count for all statuses (for summary)
    const [pendingCount, approvedCount, rejectedCount, activeCount, suspendedCount] =
      await Promise.all([
        prisma.affiliateProfile.count({ where: { status: 'pending' } }),
        prisma.affiliateProfile.count({ where: { status: 'approved' } }),
        prisma.affiliateProfile.count({ where: { status: 'rejected' } }),
        prisma.affiliateProfile.count({ where: { status: 'active' } }),
        prisma.affiliateProfile.count({ where: { status: 'suspended' } }),
      ]);

    // 6. Get total count for filtered results
    const total = await prisma.affiliateProfile.count({ where });

    // 7. Get affiliate profiles with user data
    let affiliateProfiles = await prisma.affiliateProfile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
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

    // 9. Transform to response format
    const data = affiliateProfiles.map((profile: any) => ({
      id: profile.id,
      userId: profile.userId,
      user: {
        id: profile.user.id,
        name: profile.user.name || 'Unknown',
        email: profile.user.email,
        role: profile.user.role,
      },
      referralCode: profile.referralCode,
      status: profile.status,
      tier: profile.tier,
      applicationNote: profile.applicationNote,
      rejectionReason: profile.rejectionReason,
      totalReferrals: profile.totalReferrals,
      activeReferrals: profile.activeReferrals,
      totalEarnings: profile.totalEarnings.toString(),
      pendingBalance: profile.pendingBalance.toString(),
      paidBalance: profile.paidBalance.toString(),
      approvedBy: profile.approvedBy,
      approvedAt: profile.approvedAt?.toISOString(),
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    }));

    // 10. Return paginated response with summary
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: search ? data.length : total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        active: activeCount,
        suspended: suspendedCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching affiliate applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
