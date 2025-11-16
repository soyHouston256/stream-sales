import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { z } from 'zod';

/**
 * GET /api/admin/commissions
 *
 * Get current active commission configuration.
 * Requires authentication and admin role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "saleCommission": 5.50,
 *   "registrationCommission": 10.00,
 *   "updatedBy": "admin@example.com",
 *   "updatedAt": "2025-11-16T10:30:00Z"
 * }
 */

export async function GET(request: NextRequest) {
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

    // 3. Get active commission configs
    const [saleConfig, registrationConfig] = await Promise.all([
      prisma.commissionConfig.findFirst({
        where: {
          type: 'sale',
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.commissionConfig.findFirst({
        where: {
          type: 'registration',
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // 4. Get the admin user who last updated (from the most recent config)
    let updatedBy = null;
    let updatedAt = null;

    const mostRecentConfig =
      saleConfig && registrationConfig
        ? saleConfig.updatedAt > registrationConfig.updatedAt
          ? saleConfig
          : registrationConfig
        : saleConfig || registrationConfig;

    if (mostRecentConfig) {
      updatedAt = mostRecentConfig.updatedAt;
      // Note: We don't have updatedBy in the schema, so we'll just show the timestamp
    }

    // 5. Return commission configuration
    return NextResponse.json({
      saleCommission: saleConfig
        ? parseFloat(saleConfig.rate.toString())
        : 0,
      registrationCommission: registrationConfig
        ? parseFloat(registrationConfig.rate.toString())
        : 0,
      updatedBy: user.email, // Current admin viewing
      updatedAt: updatedAt?.toISOString() || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching commission config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/commissions
 *
 * Update commission configuration.
 * Requires authentication and admin role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "saleCommission": 5.50,
 *   "registrationCommission": 10.00
 * }
 *
 * Response 200:
 * {
 *   "saleCommission": 5.50,
 *   "registrationCommission": 10.00,
 *   "message": "Commission configuration updated successfully"
 * }
 */

const updateCommissionSchema = z.object({
  saleCommission: z
    .number()
    .min(0, 'Sale commission must be at least 0')
    .max(100, 'Sale commission must be at most 100'),
  registrationCommission: z
    .number()
    .min(0, 'Registration commission must be at least 0')
    .max(100, 'Registration commission must be at most 100'),
});

export async function PUT(request: NextRequest) {
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

    // 3. Parse and validate request body
    const body = await request.json();
    const validationResult = updateCommissionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { saleCommission, registrationCommission } = validationResult.data;

    // 4. Update commission configs in a transaction
    await prisma.$transaction(async (tx: any) => {
      // 4.1. Deactivate old sale commission config
      await tx.commissionConfig.updateMany({
        where: {
          type: 'sale',
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // 4.2. Create new sale commission config
      await tx.commissionConfig.create({
        data: {
          type: 'sale',
          rate: saleCommission,
          isActive: true,
          effectiveFrom: new Date(),
        },
      });

      // 4.3. Deactivate old registration commission config
      await tx.commissionConfig.updateMany({
        where: {
          type: 'registration',
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // 4.4. Create new registration commission config
      await tx.commissionConfig.create({
        data: {
          type: 'registration',
          rate: registrationCommission,
          isActive: true,
          effectiveFrom: new Date(),
        },
      });
    });

    // 5. Return success response
    return NextResponse.json({
      saleCommission,
      registrationCommission,
      message: 'Commission configuration updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating commission config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
