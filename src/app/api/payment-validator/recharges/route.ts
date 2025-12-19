import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';
import { normalizeCountryCode, isoToPhoneMap } from '@/lib/utils/countryCode';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payment-validator/recharges
 *
 * List wallet recharges pending validation for the validator's assigned country.
 * Requires authentication and payment_validator or admin role.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 50)
 * - status: 'pending' | 'completed' | 'failed' | 'cancelled'
 * - sortBy: 'createdAt' | 'amount' (default: 'createdAt')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "data": [
 *     {
 *       "id": "recharge_123",
 *       "walletId": "wallet_456",
 *       "user": {
 *         "id": "user_789",
 *         "name": "John Doe",
 *         "email": "john@example.com",
 *         "role": "seller"
 *       },
 *       "amount": "100.00",
 *       "paymentMethod": "credit_card",
 *       "paymentGateway": "manual",
 *       "status": "pending",
 *       "createdAt": "2025-11-15T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {...}
 * }
 */

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user role (payment_validator or admin)
    const auth = await verifyPaymentValidator(request);
    if (!auth.success) {
      return auth.error;
    }

    // 2. Get validator's assigned country
    const validatorProfile = await prisma.paymentValidatorProfile.findUnique({
      where: { userId: auth.userId },
      select: { assignedCountry: true, status: true },
    });

    if (!validatorProfile || validatorProfile.status !== 'approved') {
      return NextResponse.json(
        { error: 'Validator profile not approved' },
        { status: 403 }
      );
    }

    const assignedCountry = validatorProfile.assignedCountry;
    if (!assignedCountry) {
      return NextResponse.json(
        { error: 'No country assigned to this validator' },
        { status: 400 }
      );
    }

    // Normalize to ISO format and also get phone format for matching
    const isoCountry = normalizeCountryCode(assignedCountry) || assignedCountry;
    const phoneCountry = isoToPhoneMap[isoCountry] || assignedCountry;

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    const status = searchParams.get('status') || 'pending';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // 4. Build where clause - filter by user's country
    const where: any = {
      wallet: {
        user: {
          countryCode: {
            in: [isoCountry, phoneCountry], // Match both ISO (CO) and phone (+57) formats
          },
        },
      },
    };
    if (status && status !== 'all') {
      where.status = status;
    }

    // 5. Build order by clause
    let orderBy: any = {};
    if (sortBy === 'amount') {
      orderBy.amount = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // 6. Get total count
    const total = await prisma.recharge.count({ where });

    // 7. Get recharges with wallet and user data
    const recharges = await prisma.recharge.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
      include: {
        wallet: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                countryCode: true,
              },
            },
          },
        },
      },
    });

    // 7. Transform to response format
    const data = recharges.map((recharge: any) => ({
      id: recharge.id,
      walletId: recharge.walletId,
      user: {
        id: recharge.wallet.user.id,
        name: recharge.wallet.user.name || 'Unknown',
        email: recharge.wallet.user.email,
        role: recharge.wallet.user.role,
      },
      walletBalance: recharge.wallet.balance.toString(),
      amount: recharge.amount.toString(),
      paymentMethod: recharge.paymentMethod,
      paymentGateway: recharge.paymentGateway,
      externalTransactionId: recharge.externalTransactionId,
      status: recharge.status,
      metadata: recharge.metadata || {},
      createdAt: recharge.createdAt.toISOString(),
      completedAt: recharge.completedAt?.toISOString() || null,
    }));

    // 8. Return paginated response
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching recharges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
