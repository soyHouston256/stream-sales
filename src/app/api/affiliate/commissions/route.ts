import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/affiliate/commissions
 *
 * Get paginated list of commissions earned.
 * Requires authentication and affiliate profile.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 50)
 * - type: 'registration' | 'sale' | 'bonus'
 * - referralId: string (affiliation ID)
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
 *       "id": "comm_123",
 *       "affiliateId": "user_456",
 *       "referralId": "aff_789",
 *       "referralUser": {
 *         "name": "John Doe",
 *         "email": "john@example.com"
 *       },
 *       "type": "registration",
 *       "amount": "10.00",
 *       "status": "paid",
 *       "metadata": {},
 *       "createdAt": "2025-11-15T10:30:00Z",
 *       "paidAt": "2025-11-20T10:30:00Z"
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
    const type = searchParams.get('type') || undefined;
    const referralId = searchParams.get('referralId') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    // 4. Build where clause
    const where: any = {
      affiliateId: payload.userId,
    };

    if (referralId) {
      where.id = referralId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // 5. Get affiliations (commissions are based on referrals for now)
    const affiliations = await prisma.affiliation.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        referredUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // 6. Get total count
    const total = await prisma.affiliation.count({ where });

    // 7. Transform to commission format
    // Note: In a real system, you would have a separate commissions table
    // For now, we're using the affiliation data
    const data = affiliations
      .filter((aff: any) => {
        // Filter by type if specified
        if (type === 'registration') {
          return aff.commissionAmount !== null;
        }
        return true;
      })
      .map((aff: any) => ({
        id: aff.id,
        affiliateId: aff.affiliateId,
        referralId: aff.id,
        referralUser: {
          name: aff.referredUser.name || 'Unknown',
          email: aff.referredUser.email,
        },
        type: 'registration' as const, // Default to registration commission
        amount: aff.commissionAmount?.toString() || '0.00',
        status: aff.commissionPaid ? ('paid' as const) : ('pending' as const),
        metadata: {
          referralCode: aff.referralCode,
        },
        createdAt: aff.createdAt.toISOString(),
        paidAt: aff.commissionPaid ? aff.createdAt.toISOString() : undefined,
      }));

    // 8. Return paginated response
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching commissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
