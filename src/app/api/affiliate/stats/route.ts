import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/affiliate/stats
 *
 * Get affiliate statistics including referrals and commissions.
 * Requires authentication and affiliate profile.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "totalReferrals": 15,
 *   "activeReferrals": 12,
 *   "inactiveReferrals": 3,
 *   "thisMonthReferrals": 5,
 *   "totalCommissionEarned": "250.00",
 *   "availableBalance": "125.50",
 *   "thisMonthEarned": "75.00",
 *   "pendingPayments": 2,
 *   "pendingPaymentsAmount": "125.50"
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
        { error: 'No affiliate profile found' },
        { status: 404 }
      );
    }

    // 3. Get all affiliations (referrals)
    const affiliations = await prisma.affiliation.findMany({
      where: { affiliateId: payload.userId },
    });

    // 4. Calculate this month's referrals
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthReferrals = affiliations.filter(
      (aff) => aff.createdAt >= firstDayOfMonth
    ).length;

    // 5. Calculate active/inactive referrals
    const activeReferrals = affiliations.filter((aff) => aff.status === 'active').length;
    const inactiveReferrals = affiliations.length - activeReferrals;

    // 6. Calculate this month's earnings
    const thisMonthAffiliations = affiliations.filter(
      (aff) => aff.createdAt >= firstDayOfMonth && aff.commissionPaid
    );

    const thisMonthEarned = thisMonthAffiliations.reduce(
      (sum, aff) => sum + (aff.commissionAmount ? parseFloat(aff.commissionAmount.toString()) : 0),
      0
    );

    // 7. For simplicity, we'll use the profile data
    // In a real system, you'd calculate pending payments from a separate commission/payment table
    const totalCommissionEarned = parseFloat(affiliateProfile.totalEarnings.toString());
    const availableBalance = parseFloat(affiliateProfile.pendingBalance.toString());
    const pendingPayments = availableBalance > 0 ? 1 : 0;

    // 8. Return stats
    return NextResponse.json({
      totalReferrals: affiliateProfile.totalReferrals,
      activeReferrals: affiliateProfile.activeReferrals,
      inactiveReferrals: affiliateProfile.totalReferrals - affiliateProfile.activeReferrals,
      thisMonthReferrals,
      totalCommissionEarned: totalCommissionEarned.toFixed(2),
      availableBalance: availableBalance.toFixed(2),
      thisMonthEarned: thisMonthEarned.toFixed(2),
      pendingPayments,
      pendingPaymentsAmount: availableBalance.toFixed(2),
    });
  } catch (error: any) {
    console.error('Error fetching affiliate stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
