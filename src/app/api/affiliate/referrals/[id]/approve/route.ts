import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { ApproveReferralUseCase } from '@/application/use-cases/ApproveReferralUseCase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/affiliate/referrals/[id]/approve
 *
 * Approve a pending referral by paying the approval fee.
 *
 * This endpoint:
 * 1. Validates the affiliate owns the referral
 * 2. Checks the referral is in 'pending' status
 * 3. Validates affiliate has sufficient wallet balance
 * 4. Executes atomic transaction:
 *    - Debits approval fee from affiliate wallet
 *    - Credits approval fee to admin wallet
 *    - Creates transaction record for audit trail
 *    - Updates affiliation to 'approved' status
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "message": "Referral approved successfully",
 *   "data": {
 *     "affiliation": {
 *       "id": "aff_123",
 *       "affiliateId": "user_456",
 *       "referredUserId": "user_789",
 *       "approvalStatus": "approved",
 *       "approvalFee": "10.00",
 *       "approvedAt": "2025-11-27T10:30:00Z"
 *     },
 *     "transaction": {
 *       "id": "txn_123",
 *       "type": "transfer",
 *       "amount": "10.00",
 *       "description": "Referral approval fee for John Doe"
 *     },
 *     "affiliateWallet": {
 *       "id": "wallet_123",
 *       "previousBalance": "100.00",
 *       "newBalance": "90.00"
 *     },
 *     "adminWallet": {
 *       "id": "wallet_admin",
 *       "previousBalance": "5000.00",
 *       "newBalance": "5010.00"
 *     }
 *   }
 * }
 *
 * Error Responses:
 * - 401: Unauthorized (missing or invalid token)
 * - 403: Forbidden (not the owner of the referral)
 * - 404: Referral not found
 * - 400: Bad request (referral not pending, insufficient balance, etc.)
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

    // 2. Execute use case
    const useCase = new ApproveReferralUseCase(prisma);

    const result = await useCase.execute({
      affiliationId,
      affiliateUserId: payload.userId,
    });

    // 3. Return success response
    return NextResponse.json(
      {
        message: 'Referral approved successfully',
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error approving referral:', error);

    // Handle specific errors
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message.includes('permission')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (
      error.message.includes('pending') ||
      error.message.includes('Insufficient balance') ||
      error.message.includes('configuration')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Generic error
    return NextResponse.json(
      { error: 'Failed to approve referral. Please try again later.' },
      { status: 500 }
    );
  }
}
