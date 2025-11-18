import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { z } from 'zod';
import { PrismaCommissionConfigRepository } from '@/infrastructure/repositories/PrismaCommissionConfigRepository';
import { GetActiveCommissionConfigUseCase } from '@/application/use-cases/GetActiveCommissionConfigUseCase';
import { UpdateCommissionConfigUseCase } from '@/application/use-cases/UpdateCommissionConfigUseCase';

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

    // 3. Get active commission configs using use cases
    const commissionConfigRepository = new PrismaCommissionConfigRepository(prisma);
    const getActiveCommissionUseCase = new GetActiveCommissionConfigUseCase(
      commissionConfigRepository
    );

    const [saleResult, registrationResult] = await Promise.all([
      getActiveCommissionUseCase.execute({ type: 'sale' }),
      getActiveCommissionUseCase.execute({ type: 'registration' }),
    ]);

    // 4. Get the most recent update timestamp
    let updatedAt = null;

    if (saleResult.config && registrationResult.config) {
      updatedAt =
        saleResult.config.updatedAt > registrationResult.config.updatedAt
          ? saleResult.config.updatedAt
          : registrationResult.config.updatedAt;
    } else {
      updatedAt = saleResult.config?.updatedAt || registrationResult.config?.updatedAt;
    }

    // 5. Return commission configuration
    return NextResponse.json({
      saleCommission: saleResult.config
        ? parseFloat(saleResult.config.rate.toString())
        : 0,
      registrationCommission: registrationResult.config
        ? parseFloat(registrationResult.config.rate.toString())
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

    // 4. Update commission configs using use cases
    const commissionConfigRepository = new PrismaCommissionConfigRepository(prisma);
    const updateCommissionUseCase = new UpdateCommissionConfigUseCase(
      commissionConfigRepository
    );

    // Update both configs
    await Promise.all([
      updateCommissionUseCase.execute({
        type: 'sale',
        rate: saleCommission,
        effectiveFrom: new Date(),
      }),
      updateCommissionUseCase.execute({
        type: 'registration',
        rate: registrationCommission,
        effectiveFrom: new Date(),
      }),
    ]);

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
