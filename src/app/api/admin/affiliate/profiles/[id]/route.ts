import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/affiliate/profiles/:id
 *
 * Update an affiliate profile.
 * Requires authentication and admin role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body (all fields optional):
 * {
 *   "status": "pending" | "approved" | "rejected" | "suspended" | "active",
 *   "tier": "bronze" | "silver" | "gold" | "platinum",
 *   "pendingBalance": "125.50",
 *   "paidBalance": "1000.00",
 *   "rejectionReason": "Reason for rejection (if status is rejected)"
 * }
 *
 * Response 200:
 * {
 *   "id": "prof_123",
 *   "userId": "user_456",
 *   "status": "active",
 *   "tier": "gold",
 *   "totalEarnings": "1250.50",
 *   "pendingBalance": "125.50",
 *   "paidBalance": "1125.00",
 *   "message": "Affiliate profile updated successfully"
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

    // 3. Find the affiliate profile
    const affiliateProfile = await prisma.affiliateProfile.findUnique({
      where: { id: params.id },
    });

    if (!affiliateProfile) {
      return NextResponse.json(
        { error: 'Affiliate profile not found' },
        { status: 404 }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const updateData: any = {};

    // Validate and set status
    if (body.status) {
      const validStatuses = ['pending', 'approved', 'rejected', 'suspended', 'active'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;

      // If approving, set approval metadata
      if (body.status === 'approved' && affiliateProfile.status === 'pending') {
        updateData.approvedBy = payload.userId;
        updateData.approvedAt = new Date();
      }
    }

    // Validate and set tier
    if (body.tier) {
      const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
      if (!validTiers.includes(body.tier)) {
        return NextResponse.json(
          { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.tier = body.tier;
    }

    // Validate and set rejection reason
    if (body.rejectionReason !== undefined) {
      if (body.rejectionReason && body.rejectionReason.length > 500) {
        return NextResponse.json(
          { error: 'Rejection reason must be less than 500 characters' },
          { status: 400 }
        );
      }
      updateData.rejectionReason = body.rejectionReason;
    }

    // Validate and set balances
    if (body.pendingBalance !== undefined) {
      const pendingBalance = parseFloat(body.pendingBalance);
      if (isNaN(pendingBalance) || pendingBalance < 0) {
        return NextResponse.json(
          { error: 'Pending balance must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.pendingBalance = new Decimal(pendingBalance);
    }

    if (body.paidBalance !== undefined) {
      const paidBalance = parseFloat(body.paidBalance);
      if (isNaN(paidBalance) || paidBalance < 0) {
        return NextResponse.json(
          { error: 'Paid balance must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.paidBalance = new Decimal(paidBalance);
    }

    // 5. Check if there are any updates to apply
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // 6. Update the affiliate profile
    const updatedProfile = await prisma.affiliateProfile.update({
      where: { id: params.id },
      data: updateData,
    });

    // 7. Recalculate total earnings
    const totalEarnings = parseFloat(updatedProfile.pendingBalance.toString()) +
                          parseFloat(updatedProfile.paidBalance.toString());

    // Update total earnings if balances were modified
    if (body.pendingBalance !== undefined || body.paidBalance !== undefined) {
      await prisma.affiliateProfile.update({
        where: { id: params.id },
        data: {
          totalEarnings: new Decimal(totalEarnings),
        },
      });
    }

    // 8. Fetch updated profile
    const finalProfile = await prisma.affiliateProfile.findUnique({
      where: { id: params.id },
    });

    // 9. Return success response
    return NextResponse.json({
      id: finalProfile!.id,
      userId: finalProfile!.userId,
      referralCode: finalProfile!.referralCode,
      status: finalProfile!.status,
      tier: finalProfile!.tier,
      totalEarnings: finalProfile!.totalEarnings.toString(),
      pendingBalance: finalProfile!.pendingBalance.toString(),
      paidBalance: finalProfile!.paidBalance.toString(),
      totalReferrals: finalProfile!.totalReferrals,
      activeReferrals: finalProfile!.activeReferrals,
      approvedBy: finalProfile!.approvedBy,
      approvedAt: finalProfile!.approvedAt?.toISOString(),
      rejectionReason: finalProfile!.rejectionReason,
      updatedAt: finalProfile!.updatedAt.toISOString(),
      message: 'Affiliate profile updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating affiliate profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
