import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/settings/referral-fee
 *
 * Get the current active referral approval fee configuration.
 * Accessible by authenticated users (affiliates need to see the fee amount).
 *
 * Headers:
 * - Authorization: Bearer <token> (any authenticated user)
 *
 * Response 200:
 * {
 *   "data": {
 *     "id": "config_123",
 *     "approvalFee": "10.00",
 *     "isActive": true,
 *     "effectiveFrom": "2025-11-27T10:00:00Z",
 *     "createdAt": "2025-11-27T10:00:00Z",
 *     "updatedAt": "2025-11-27T10:00:00Z"
 *   }
 * }
 *
 * Response 404: No active configuration found
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify JWT token (any authenticated user can read)
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

    // 2. No need to verify admin role for GET (read-only)
    // Affiliates need to see the approval fee amount

    // 3. Get active configuration
    const config = await prisma.referralApprovalConfig.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'No active referral approval fee configuration found' },
        { status: 404 }
      );
    }

    // 4. Return configuration
    return NextResponse.json({
      data: {
        id: config.id,
        approvalFee: config.approvalFee.toString(),
        isActive: config.isActive,
        effectiveFrom: config.effectiveFrom.toISOString(),
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching referral approval fee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings/referral-fee
 *
 * Create or update the referral approval fee configuration.
 * This will deactivate all previous configurations and create a new active one.
 *
 * Headers:
 * - Authorization: Bearer <token> (must be admin)
 *
 * Body:
 * {
 *   "approvalFee": 10.00
 * }
 *
 * Response 200:
 * {
 *   "message": "Referral approval fee updated successfully",
 *   "data": {
 *     "id": "config_123",
 *     "approvalFee": "10.00",
 *     "isActive": true,
 *     "effectiveFrom": "2025-11-27T10:00:00Z",
 *     "createdAt": "2025-11-27T10:00:00Z",
 *     "updatedAt": "2025-11-27T10:00:00Z"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
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

    // 2. Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const { approvalFee } = body;

    if (approvalFee === undefined || approvalFee === null) {
      return NextResponse.json(
        { error: 'approvalFee is required' },
        { status: 400 }
      );
    }

    const feeValue = parseFloat(approvalFee);

    if (isNaN(feeValue) || feeValue < 0) {
      return NextResponse.json(
        { error: 'approvalFee must be a positive number' },
        { status: 400 }
      );
    }

    // 4. Execute transaction: deactivate old configs and create new one
    const result = await prisma.$transaction(async (tx) => {
      // Deactivate all previous configurations
      await tx.referralApprovalConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false, updatedAt: new Date() },
      });

      // Create new active configuration
      const newConfig = await tx.referralApprovalConfig.create({
        data: {
          approvalFee: feeValue,
          isActive: true,
          effectiveFrom: new Date(),
        },
      });

      return newConfig;
    });

    // 5. Return success response
    return NextResponse.json(
      {
        message: 'Referral approval fee updated successfully',
        data: {
          id: result.id,
          approvalFee: result.approvalFee.toString(),
          isActive: result.isActive,
          effectiveFrom: result.effectiveFrom.toISOString(),
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating referral approval fee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
