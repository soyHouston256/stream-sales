import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/validator-transfers
 *
 * List all validator-to-admin transfer requests.
 * Admin only.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Query params:
 * - status: 'pending' | 'approved' | 'rejected' | 'all' (default: 'pending')
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

        // Verify admin role
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user || user.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden: Admin role required' },
                { status: 403 }
            );
        }

        // 2. Parse query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
        const status = searchParams.get('status') || 'pending';

        // 3. Build where clause
        const where: any = {};

        if (status !== 'all') {
            where.status = status;
        }

        // 4. Get transfers with pagination
        const [transfers, total] = await Promise.all([
            prisma.validatorAdminTransfer.findMany({
                where,
                include: {
                    validator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            paymentValidatorProfile: {
                                select: {
                                    assignedCountry: true,
                                },
                            },
                        },
                    },
                    processedByUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    fundEntries: {
                        include: {
                            recharge: {
                                select: {
                                    id: true,
                                    amount: true,
                                    paymentMethod: true,
                                    createdAt: true,
                                },
                            },
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
        const data = transfers.map((transfer: any) => ({
            id: transfer.id,
            validator: {
                id: transfer.validator.id,
                name: transfer.validator.name,
                email: transfer.validator.email,
                country: transfer.validator.paymentValidatorProfile?.assignedCountry || null,
            },
            totalAmount: transfer.totalAmount.toString(),
            commissionAmount: transfer.commissionAmount.toString(),
            transferAmount: transfer.transferAmount.toString(),
            paymentMethod: transfer.paymentMethod,
            holderName: transfer.holderName,
            paymentTime: transfer.paymentTime,
            voucherUrl: transfer.voucherUrl,
            paymentDetails: transfer.paymentDetails,
            status: transfer.status,
            rejectionReason: transfer.rejectionReason,
            processedBy: transfer.processedByUser,
            processedAt: transfer.processedAt?.toISOString() || null,
            createdAt: transfer.createdAt.toISOString(),
            completedAt: transfer.completedAt?.toISOString() || null,
            fundEntries: transfer.fundEntries.map((entry: { id: string; amount: { toString: () => string }; recharge: { id: string; amount: { toString: () => string }; paymentMethod: string; createdAt: Date } }) => ({
                id: entry.id,
                amount: entry.amount.toString(),
                recharge: {
                    id: entry.recharge.id,
                    amount: entry.recharge.amount.toString(),
                    paymentMethod: entry.recharge.paymentMethod,
                    createdAt: entry.recharge.createdAt.toISOString(),
                },
            })),
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
    } catch (error: any) {
        console.error('Error fetching validator transfers:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
