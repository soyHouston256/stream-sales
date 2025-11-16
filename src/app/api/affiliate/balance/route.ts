import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/affiliate/balance
 *
 * Get commission balance information.
 * Requires authentication and affiliate profile.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "availableBalance": "125.50",
 *   "totalEarned": "250.00",
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

    // 3. Calculate this month's earnings
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const affiliations = await prisma.affiliation.findMany({
      where: {
        affiliateId: payload.userId,
        createdAt: {
          gte: firstDayOfMonth,
        },
        commissionPaid: true,
      },
    });

    const thisMonthEarned = affiliations.reduce(
      (sum, aff) => sum + (aff.commissionAmount ? parseFloat(aff.commissionAmount.toString()) : 0),
      0
    );

    // 4. Calculate pending payments (balance > 0 means pending)
    const availableBalance = parseFloat(affiliateProfile.pendingBalance.toString());
    const pendingPayments = availableBalance > 0 ? 1 : 0;

    // 5. Return balance info
    return NextResponse.json({
      availableBalance: availableBalance.toFixed(2),
      totalEarned: parseFloat(affiliateProfile.totalEarnings.toString()).toFixed(2),
      thisMonthEarned: thisMonthEarned.toFixed(2),
      pendingPayments,
      pendingPaymentsAmount: availableBalance.toFixed(2),
    });
  } catch (error: any) {
    console.error('Error fetching commission balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
