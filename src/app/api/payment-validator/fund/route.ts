import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payment-validator/fund
 *
 * Get the validator's accumulated fund balance and entries.
 * Returns pending entries (not yet transferred to admin) and summary.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "balance": "1500.00",
 *   "pendingEntries": [...],
 *   "transferredTotal": "500.00",
 *   "summary": {
 *     "pendingCount": 10,
 *     "transferredCount": 5
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

        // 2. Get all fund entries for this validator
        const [pendingEntries, transferredEntries] = await Promise.all([
            prisma.validatorFundEntry.findMany({
                where: {
                    validatorId: auth.userId,
                    status: 'pending',
                },
                include: {
                    recharge: {
                        include: {
                            wallet: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            email: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.validatorFundEntry.findMany({
                where: {
                    validatorId: auth.userId,
                    status: 'transferred',
                },
                include: {
                    transfer: {
                        select: {
                            id: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        // 3. Calculate totals
        const pendingBalance = pendingEntries.reduce(
            (sum, entry) => sum + Number(entry.amount),
            0
        );
        const transferredTotal = transferredEntries.reduce(
            (sum, entry) => sum + Number(entry.amount),
            0
        );

        // 4. Format response
        const formattedEntries = pendingEntries.map((entry) => ({
            id: entry.id,
            rechargeId: entry.rechargeId,
            amount: entry.amount.toString(),
            status: entry.status,
            createdAt: entry.createdAt.toISOString(),
            recharge: {
                id: entry.recharge.id,
                paymentMethod: entry.recharge.paymentMethod,
                createdAt: entry.recharge.createdAt.toISOString(),
                user: entry.recharge.wallet.user,
            },
        }));

        return NextResponse.json({
            balance: pendingBalance.toFixed(2),
            pendingEntries: formattedEntries,
            transferredTotal: transferredTotal.toFixed(2),
            summary: {
                pendingCount: pendingEntries.length,
                transferredCount: transferredEntries.length,
            },
        });
    } catch (error: any) {
        console.error('Error fetching validator fund:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
