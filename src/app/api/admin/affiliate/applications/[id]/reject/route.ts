import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/affiliate/applications/:id/reject
 *
 * Reject an affiliate application.
 * Requires authentication and admin role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "reason": "Reason for rejection" // Required, 10-500 characters
 * }
 *
 * Response 200:
 * {
 *   "id": "prof_123",
 *   "userId": "user_456",
 *   "status": "rejected",
 *   "rejectionReason": "Does not meet criteria...",
 *   "message": "Affiliate application rejected"
 * }
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 3. Parse request body
    const body = await request.json();
    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    if (reason.length < 10) {
      return NextResponse.json(
        { error: 'Rejection reason must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        { error: 'Rejection reason must be less than 500 characters' },
        { status: 400 }
      );
    }

    // 4. Find the affiliate profile
    const affiliateProfile = await prisma.affiliateProfile.findUnique({
      where: { id: params.id },
    });

    if (!affiliateProfile) {
      return NextResponse.json(
        { error: 'Affiliate application not found' },
        { status: 404 }
      );
    }

    // 5. Check if already approved or active
    if (affiliateProfile.status === 'approved' || affiliateProfile.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot reject an approved or active affiliate' },
        { status: 400 }
      );
    }

    // 6. Update affiliate profile to rejected
    const updatedProfile = await prisma.affiliateProfile.update({
      where: { id: params.id },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        approvedBy: null,
        approvedAt: null,
      },
    });

    // 7. Return success response
    return NextResponse.json({
      id: updatedProfile.id,
      userId: updatedProfile.userId,
      referralCode: updatedProfile.referralCode,
      status: updatedProfile.status,
      rejectionReason: updatedProfile.rejectionReason,
      message: 'Affiliate application rejected',
    });
  } catch (error: any) {
    console.error('Error rejecting affiliate application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
