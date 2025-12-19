import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/affiliate/applications/:id/approve
 *
 * Approve an affiliate application.
 * Requires authentication and admin role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body (optional):
 * {
 *   "tier": "bronze" | "silver" | "gold" | "platinum" // Default: bronze
 * }
 *
 * Response 200:
 * {
 *   "id": "prof_123",
 *   "userId": "user_456",
 *   "status": "approved",
 *   "tier": "bronze",
 *   "approvedBy": "admin_789",
 *   "approvedAt": "2025-11-16T10:30:00Z",
 *   "message": "Affiliate application approved successfully"
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

    // 3. Parse optional request body
    let tier = 'bronze';
    try {
      const body = await request.json();
      if (body.tier && ['bronze', 'silver', 'gold', 'platinum'].includes(body.tier)) {
        tier = body.tier;
      }
    } catch {
      // No body or invalid JSON, use default
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
        { error: 'Application is already approved or active' },
        { status: 400 }
      );
    }

    // 6. Update affiliate profile to approved
    const updatedProfile = await prisma.affiliateProfile.update({
      where: { id: params.id },
      data: {
        status: 'approved',
        tier,
        approvedBy: payload.userId,
        approvedAt: new Date(),
        rejectionReason: null, // Clear any previous rejection reason
      },
    });

    // 7. Return success response
    return NextResponse.json({
      id: updatedProfile.id,
      userId: updatedProfile.userId,
      referralCode: updatedProfile.referralCode,
      status: updatedProfile.status,
      tier: updatedProfile.tier,
      approvedBy: updatedProfile.approvedBy,
      approvedAt: updatedProfile.approvedAt?.toISOString(),
      message: 'Affiliate application approved successfully',
    });
  } catch (error: unknown) {
    console.error('Error approving affiliate application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
