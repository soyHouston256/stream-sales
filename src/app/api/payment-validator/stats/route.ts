import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payment-validator/stats
 *
 * Get payment validation statistics for the dashboard.
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
 *   "withdrawals": {
 *     "pending": 8,
 *     "approved": 3,
 *     "rejected": 1,
 *     "completed": 95,
 *     "totalPendingAmount": "3500.00",
 *     "totalCompletedAmount": "28000.00"
 *   },
 *   "myActivity": {
 *     "rechargesProcessed": 45,
 *     "withdrawalsProcessed": 32,
 *     "totalProcessed": 77
 *   }
 * }
 */

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user role (payment_validator or admin)
    const auth = await verifyPaymentValidator(request);
    if (!auth.success) {
      return auth.error;
    }

    // 2. Get recharge statistics
    const [
      pendingRecharges,
      completedRecharges,
      failedRecharges,
      cancelledRecharges,
    ] = await Promise.all([
      prisma.recharge.findMany({ where: { status: 'pending' } }),
      prisma.recharge.findMany({ where: { status: 'completed' } }),
      prisma.recharge.findMany({ where: { status: 'failed' } }),
      prisma.recharge.findMany({ where: { status: 'cancelled' } }),
    ]);

    const totalPendingRechargeAmount = pendingRecharges.reduce(
      (sum: number, r: any) => sum + parseFloat(r.amount.toString()),
      0
    );

    const totalCompletedRechargeAmount = completedRecharges.reduce(
      (sum: number, r: any) => sum + parseFloat(r.amount.toString()),
      0
    );

    // 3. Get withdrawal statistics
    const [
      pendingWithdrawals,
      approvedWithdrawals,
      rejectedWithdrawals,
      completedWithdrawals,
    ] = await Promise.all([
      prisma.withdrawal.findMany({ where: { status: 'pending' } }),
      prisma.withdrawal.findMany({ where: { status: 'approved' } }),
      prisma.withdrawal.findMany({ where: { status: 'rejected' } }),
      prisma.withdrawal.findMany({ where: { status: 'completed' } }),
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
  } catch (error: any) {
    console.error('Error fetching payment validator stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
