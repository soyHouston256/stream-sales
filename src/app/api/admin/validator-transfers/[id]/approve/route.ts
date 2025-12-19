import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/validator-transfers/[id]/approve
 *
 * Approve a validator-to-admin transfer request.
 * Admin only.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "id": "transfer_123",
 *   "status": "approved",
 *   "completedAt": "2025-12-18T10:30:00Z",
 *   "message": "Transfer approved successfully"
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

        // 2. Find the transfer
        const transfer = await prisma.validatorAdminTransfer.findUnique({
            where: { id: params.id },
            include: {
                validator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!transfer) {
            return NextResponse.json(
                { error: 'Transfer not found' },
                { status: 404 }
            );
        }

        // 3. Check if transfer is pending
        if (transfer.status !== 'pending') {
            return NextResponse.json(
                { error: `Cannot approve transfer with status: ${transfer.status}` },
                { status: 400 }
            );
        }

        // 4. Approve the transfer
        const updatedTransfer = await prisma.validatorAdminTransfer.update({
            where: { id: params.id },
            data: {
                status: 'approved',
                processedBy: user.id,
                processedAt: new Date(),
                completedAt: new Date(),
            },
        });

        return NextResponse.json({
            id: updatedTransfer.id,
            validatorId: updatedTransfer.validatorId,
            validator: transfer.validator,
            totalAmount: updatedTransfer.totalAmount.toString(),
            commissionAmount: updatedTransfer.commissionAmount.toString(),
            transferAmount: updatedTransfer.transferAmount.toString(),
            status: updatedTransfer.status,
            processedAt: updatedTransfer.processedAt?.toISOString(),
            completedAt: updatedTransfer.completedAt?.toISOString(),
            message: 'Transfer approved successfully',
        });
    } catch (error: any) {
        console.error('Error approving validator transfer:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
