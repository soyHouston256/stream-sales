import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payment-validator/fund/transfers
 *
 * Get the validator's transfer history to admin.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Query params:
 * - status: 'pending' | 'approved' | 'rejected' | 'all' (default: 'all')
 * - page: number (default: 1)
 * - limit: number (default: 10)
 *
 * Response 200:
 * {
 *   "data": [...],
 *   "pagination": {...}
 * }
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Verify user role (payment_validator)
        const auth = await verifyPaymentValidator(request);
        if (!auth.success) {
            return auth.error;
        }

        // 2. Parse query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
        const status = searchParams.get('status') || 'all';

        // 3. Build where clause
        const where: any = {
            validatorId: auth.userId,
        };

        if (status !== 'all') {
            where.status = status;
        }

        // 4. Get transfers with pagination
        const [transfers, total] = await Promise.all([
            prisma.validatorAdminTransfer.findMany({
                where,
                include: {
                    processedByUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    fundEntries: {
                        select: {
                            id: true,
                            amount: true,
                            rechargeId: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.validatorAdminTransfer.count({ where }),
        ]);

        // 5. Format response
        const data = transfers.map((transfer) => ({
            id: transfer.id,
            totalAmount: transfer.totalAmount.toString(),
            commissionAmount: transfer.commissionAmount.toString(),
            transferAmount: transfer.transferAmount.toString(),
            paymentMethod: transfer.paymentMethod,
            holderName: transfer.holderName,
            paymentTime: transfer.paymentTime,
            voucherUrl: transfer.voucherUrl,
            status: transfer.status,
            rejectionReason: transfer.rejectionReason,
            processedBy: transfer.processedByUser,
            processedAt: transfer.processedAt?.toISOString() || null,
            createdAt: transfer.createdAt.toISOString(),
            completedAt: transfer.completedAt?.toISOString() || null,
            entriesCount: transfer.fundEntries.length,
        }));

        return NextResponse.json({
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error: unknown) {
        console.error('Error fetching fund transfers:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
