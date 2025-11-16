import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/affiliate/referrals
 *
 * Get paginated list of referrals with filters.
 * Requires authentication and affiliate profile.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 50)
 * - status: 'active' | 'inactive' | 'suspended'
 * - role: UserRole
 * - search: string (search by name or email)
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
 *       "id": "aff_123",
 *       "affiliateId": "user_456",
 *       "referredUserId": "user_789",
 *       "referredUser": {
 *         "id": "user_789",
 *         "name": "John Doe",
 *         "email": "john@example.com",
 *         "role": "seller"
 *       },
 *       "status": "active",
 *       "commissionPaid": true,
 *       "commissionAmount": "10.00",
 *       "totalCommissionEarned": "50.00",
 *       "createdAt": "2025-11-15T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 45,
 *     "totalPages": 5
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

    // 2. Check affiliate profile exists
    const affiliateProfile = await prisma.affiliateProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!affiliateProfile) {
      return NextResponse.json(
        { error: 'No affiliate profile found' },
        { status: 404 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    const status = searchParams.get('status') || undefined;
    const role = searchParams.get('role') || undefined;
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    // 4. Build where clause
    const where: any = {
      affiliateId: payload.userId,
    };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // 5. Get total count
    const total = await prisma.affiliation.count({ where });

    // 6. Get affiliations with referred user data
    const affiliations = await prisma.affiliation.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        referredUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // 7. Filter by role or search if specified
    let filteredAffiliations = affiliations;

    if (role) {
      filteredAffiliations = filteredAffiliations.filter(
        (aff: any) => aff.referredUser.role === role
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredAffiliations = filteredAffiliations.filter(
        (aff: any) =>
          aff.referredUser.name?.toLowerCase().includes(searchLower) ||
          aff.referredUser.email.toLowerCase().includes(searchLower)
      );
    }

    // 8. For each referral, calculate total commission earned
    // In a real system, this would come from a commissions table
    // For now, we'll use the commissionAmount from the affiliation
    const data = filteredAffiliations.map((aff: any) => ({
      id: aff.id,
      affiliateId: aff.affiliateId,
      referredUserId: aff.referredUserId,
      referredUser: {
        id: aff.referredUser.id,
        name: aff.referredUser.name || 'Unknown',
        email: aff.referredUser.email,
        role: aff.referredUser.role,
      },
      status: aff.status,
      commissionPaid: aff.commissionPaid,
      commissionAmount: aff.commissionAmount?.toString() || '0.00',
      totalCommissionEarned: aff.commissionAmount?.toString() || '0.00', // TODO: Calculate from commissions table
      createdAt: aff.createdAt.toISOString(),
    }));

    // 9. Return paginated response
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: filteredAffiliations.length,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
