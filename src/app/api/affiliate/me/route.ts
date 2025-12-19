import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/affiliate/me
 *
 * Get current user's affiliate profile information.
 * Requires authentication and affiliate role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "id": "profile_123",
 *   "userId": "user_456",
 *   "referralCode": "AFF-12345",
 *   "referralLink": "https://yourdomain.com/register?ref=AFF-12345",
 *   "status": "active",
 *   "tier": "bronze",
 *   "totalEarnings": "100.50",
 *   "pendingBalance": "50.25",
 *   "paidBalance": "50.25",
 *   "totalReferrals": 10,
 *   "activeReferrals": 8,
 *   "createdAt": "2025-11-15T10:30:00Z",
 *   "updatedAt": "2025-11-16T10:30:00Z"
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

    // 2. Get user with affiliate profile
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        affiliateProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Check if user has affiliate profile
    if (!user.affiliateProfile) {
      return NextResponse.json(
        { error: 'No affiliate profile found. Please apply to become an affiliate.' },
        { status: 404 }
      );
    }

    const profile = user.affiliateProfile;

    // 4. Build referral link with proper host detection
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;
    const referralLink = `${baseUrl}/register?ref=${profile.referralCode}`;

    // 5. Return affiliate info
    return NextResponse.json({
      id: profile.id,
      userId: profile.userId,
      referralCode: profile.referralCode,
      referralLink,
      status: profile.status,
      tier: profile.tier,
      totalEarnings: profile.totalEarnings.toString(),
      pendingBalance: profile.pendingBalance.toString(),
      paidBalance: profile.paidBalance.toString(),
      totalReferrals: profile.totalReferrals,
      activeReferrals: profile.activeReferrals,
      applicationNote: profile.applicationNote,
      rejectionReason: profile.rejectionReason,
      approvedBy: profile.approvedBy,
      approvedAt: profile.approvedAt?.toISOString(),
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    console.error('Error fetching affiliate info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
