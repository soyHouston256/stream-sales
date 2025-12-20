import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';
import { normalizeCountryCode, isoToPhoneMap } from '@/lib/utils/countryCode';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payment-validator/stats
 *
 * Get payment validation statistics for the dashboard.
 * Only shows stats for the validator's assigned country.
 * Requires payment_validator or admin role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "recharges": {
 *     "pending": 5,
 *     "completed": 120,
 *     "failed": 3,
 *     "cancelled": 2,
 *     "totalPendingAmount": "1500.00",
 *     "totalCompletedAmount": "45000.00"
 *   },
 *   "withdrawals": {...},
 *   "myActivity": {...}
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

    // Normalize to ISO format and get phone format for matching
    const isoCountry = normalizeCountryCode(assignedCountry) || assignedCountry;
    // eslint-disable-next-line security/detect-object-injection
    const phoneCountry = isoToPhoneMap[isoCountry] || assignedCountry;
    const countryCodes = [isoCountry, phoneCountry];

    // 3. Build country filter for recharges (through wallet -> user -> countryCode)
    const countryFilter = {
      wallet: {
        user: {
          countryCode: { in: countryCodes },
        },
      },
    };

    // 4. Get recharge statistics filtered by country
    const [
      pendingRecharges,
      completedRecharges,
      failedRecharges,
      cancelledRecharges,
    ] = await Promise.all([
      prisma.recharge.findMany({ where: { status: 'pending', ...countryFilter } }),
      prisma.recharge.findMany({ where: { status: 'completed', ...countryFilter } }),
      prisma.recharge.findMany({ where: { status: 'failed', ...countryFilter } }),
      prisma.recharge.findMany({ where: { status: 'cancelled', ...countryFilter } }),
    ]);

    const totalPendingRechargeAmount = pendingRecharges.reduce(
      (sum: number, r: any) => sum + parseFloat(r.amount.toString()),
      0
    );

    const totalCompletedRechargeAmount = completedRecharges.reduce(
      (sum: number, r: any) => sum + parseFloat(r.amount.toString()),
      0
    );

    // 5. Build country filter for withdrawals (through wallet -> user -> countryCode)
    const withdrawalCountryFilter = {
      wallet: {
        user: {
          countryCode: { in: countryCodes },
        },
      },
    };

    // 6. Get withdrawal statistics filtered by country
    const [
      pendingWithdrawals,
      approvedWithdrawals,
      rejectedWithdrawals,
      completedWithdrawals,
    ] = await Promise.all([
      prisma.withdrawal.findMany({ where: { status: 'pending', ...withdrawalCountryFilter } }),
      prisma.withdrawal.findMany({ where: { status: 'approved', ...withdrawalCountryFilter } }),
      prisma.withdrawal.findMany({ where: { status: 'rejected', ...withdrawalCountryFilter } }),
      prisma.withdrawal.findMany({ where: { status: 'completed', ...withdrawalCountryFilter } }),
    ]);

    const totalPendingWithdrawalAmount = pendingWithdrawals.reduce(
      (sum: number, w: any) => sum + parseFloat(w.amount.toString()),
      0
    );

    const totalCompletedWithdrawalAmount = completedWithdrawals.reduce(
      (sum: number, w: any) => sum + parseFloat(w.amount.toString()),
      0
    );

    // 4. Get user's processing activity
    const myRechargesProcessed = await prisma.recharge.count({
      where: {
        metadata: {
          path: ['approvedBy'],
          equals: auth.userId,
        },
      },
    });

    const myWithdrawalsProcessed = await prisma.withdrawal.count({
      where: {
        processedBy: auth.userId,
      },
    });

    // 5. Return statistics
    return NextResponse.json({
      recharges: {
        pending: pendingRecharges.length,
        completed: completedRecharges.length,
        failed: failedRecharges.length,
        cancelled: cancelledRecharges.length,
        totalPendingAmount: totalPendingRechargeAmount.toFixed(2),
        totalCompletedAmount: totalCompletedRechargeAmount.toFixed(2),
      },
      withdrawals: {
        pending: pendingWithdrawals.length,
        approved: approvedWithdrawals.length,
        rejected: rejectedWithdrawals.length,
        completed: completedWithdrawals.length,
        totalPendingAmount: totalPendingWithdrawalAmount.toFixed(2),
        totalCompletedAmount: totalCompletedWithdrawalAmount.toFixed(2),
      },
      myActivity: {
        rechargesProcessed: myRechargesProcessed,
        withdrawalsProcessed: myWithdrawalsProcessed,
        totalProcessed: myRechargesProcessed + myWithdrawalsProcessed,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching payment validator stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
