import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { RejectReferralUseCase } from '@/application/use-cases/RejectReferralUseCase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/affiliate/referrals/[id]/reject
 *
 * Reject a pending referral without any fee.
 *
 * This endpoint:
 * 1. Validates the affiliate owns the referral
 * 2. Checks the referral is in 'pending' status
 * 3. Updates affiliation to 'rejected' status
 * 4. No financial transaction occurs
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body (optional):
 * {
 *   "rejectionReason": "User does not meet requirements"
 * }
 *
 * Response 200:
 * {
 *   "message": "Referral rejected successfully",
 *   "data": {
 *     "affiliation": {
 *       "id": "aff_123",
 *       "affiliateId": "user_456",
 *       "referredUserId": "user_789",
 *       "approvalStatus": "rejected",
 *       "rejectedAt": "2025-11-27T10:30:00Z"
 *     }
 *   }
 * }
 *
 * Error Responses:
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (not the owner of the referral)
 * - 404: Referral not found
 * - 400: Bad request (referral not pending)
 * - 500: Internal server error
 */
export async function POST(
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

    const affiliationId = params.id;

    // 2. Parse optional request body
    let rejectionReason: string | undefined;
    try {
      const body = await request.json();
      rejectionReason = body.rejectionReason;
    } catch {
      // Body is optional, ignore parse errors
    }

    // 3. Execute use case
    const useCase = new RejectReferralUseCase(prisma);

    const result = await useCase.execute({
      affiliationId,
      affiliateUserId: payload.userId,
      rejectionReason,
    });

    // 4. Return success response
    return NextResponse.json(
      {
        message: 'Referral rejected successfully',
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error rejecting referral:', error);

    // Handle specific errors
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message.includes('pending')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Generic error
    return NextResponse.json(
      { error: 'Failed to reject referral. Please try again later.' },
      { status: 500 }
    );
  }
}
