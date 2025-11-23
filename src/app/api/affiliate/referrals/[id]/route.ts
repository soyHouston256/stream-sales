import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/affiliate/referrals/:id
 *
 * Get detailed information about a specific referral.
 * Requires authentication and affiliate profile.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "id": "aff_123",
 *   "affiliateId": "user_456",
 *   "referredUserId": "user_789",
 *   "referredUser": {
 *     "id": "user_789",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "role": "seller"
 *   },
 *   "status": "active",
 *   "commissionPaid": true,
 *   "commissionAmount": "10.00",
 *   "totalCommissionEarned": "50.00",
 *   "createdAt": "2025-11-15T10:30:00Z",
 *   "activitySummary": {
 *     "totalPurchases": 5,
 *     "totalProducts": 0,
 *     "totalSales": 0
 *   },
 *   "commissionTimeline": []
 * }
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 3. Get affiliation with referred user data
    const affiliation = await prisma.affiliation.findFirst({
      where: {
        id: params.id,
        affiliateId: payload.userId, // Ensure it belongs to this affiliate
      },
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

    if (!affiliation) {
      return NextResponse.json(
        { error: 'Referral not found or access denied' },
        { status: 404 }
      );
    }

    // 4. Get activity summary based on user role
    const activitySummary: any = {};

    if (affiliation.referredUser.role === 'seller') {
      // Count purchases made by this seller
      const purchases = await prisma.purchase.findMany({
        where: { sellerId: affiliation.referredUserId },
      });
      activitySummary.totalPurchases = purchases.length;
    }

    if (affiliation.referredUser.role === 'provider') {
      // Count products and sales
      const products = await prisma.product.findMany({
        where: { providerId: affiliation.referredUserId },
      });
      const sales = await prisma.purchase.findMany({
        where: { providerId: affiliation.referredUserId, status: 'completed' },
      });
      activitySummary.totalProducts = products.length;
      activitySummary.totalSales = sales.length;
    }

    // 5. Get commission timeline (placeholder - would come from commissions table)
    const commissionTimeline: any[] = [];
    // TODO: Implement when commission tracking table is created

    // 6. Return detailed referral info
    return NextResponse.json({
      id: affiliation.id,
      affiliateId: affiliation.affiliateId,
      referredUserId: affiliation.referredUserId,
      referredUser: {
        id: affiliation.referredUser.id,
        name: affiliation.referredUser.name || 'Unknown',
        email: affiliation.referredUser.email,
        role: affiliation.referredUser.role,
      },
      status: affiliation.status,
      commissionPaid: affiliation.commissionPaid,
      commissionAmount: affiliation.commissionAmount?.toString() || '0.00',
      totalCommissionEarned: affiliation.commissionAmount?.toString() || '0.00',
      createdAt: affiliation.createdAt.toISOString(),
      activitySummary,
      commissionTimeline,
    });
  } catch (error: any) {
    console.error('Error fetching referral details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
