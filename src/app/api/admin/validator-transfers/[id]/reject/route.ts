import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const rejectSchema = z.object({
    reason: z.string().min(1, 'Rejection reason is required'),
});

/**
 * PUT /api/admin/validator-transfers/[id]/reject
 *
 * Reject a validator-to-admin transfer request.
 * Returns the fund entries back to pending status.
 * Admin only.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "reason": "Payment details do not match"
 * }
 *
 * Response 200:
 * {
 *   "id": "transfer_123",
 *   "status": "rejected",
 *   "rejectionReason": "...",
 *   "message": "Transfer rejected. Fund entries returned to pending."
 * }
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        // 2. Parse and validate request body
        const body = await request.json();
        const validation = rejectSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { reason } = validation.data;

        // 3. Find the transfer
        const transfer = await prisma.validatorAdminTransfer.findUnique({
            where: { id: params.id },
            include: {
                fundEntries: true,
            },
        });

        if (!transfer) {
            return NextResponse.json(
                { error: 'Transfer not found' },
                { status: 404 }
            );
        }

        // 4. Check if transfer is pending
        if (transfer.status !== 'pending') {
            return NextResponse.json(
                { error: `Cannot reject transfer with status: ${transfer.status}` },
                { status: 400 }
            );
        }

        // 5. Reject the transfer and return fund entries to pending
        const result = await prisma.$transaction(async (tx: any) => {
            // 5.1. Update fund entries back to pending
            await tx.validatorFundEntry.updateMany({
                where: {
                    transferId: params.id,
                },
                data: {
                    transferId: null,
                    status: 'pending',
                },
            });

            // 5.2. Reject the transfer
            const updatedTransfer = await tx.validatorAdminTransfer.update({
                where: { id: params.id },
                data: {
                    status: 'rejected',
                    rejectionReason: reason,
                    processedBy: user.id,
                    processedAt: new Date(),
                },
            });

            return updatedTransfer;
        });

        return NextResponse.json({
            id: result.id,
            validatorId: result.validatorId,
            totalAmount: result.totalAmount.toString(),
            status: result.status,
            rejectionReason: result.rejectionReason,
            processedAt: result.processedAt?.toISOString(),
            message: 'Transfer rejected. Fund entries returned to pending.',
        });
    } catch (error: unknown) {
        console.error('Error rejecting validator transfer:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
