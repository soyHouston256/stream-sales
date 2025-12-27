import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/provider/inventory/[accountId]
 *
 * Delete an inventory account and its slots.
 * Only the provider who owns the product can delete.
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { accountId: string } }
) {
    try {
        // 1. Verify JWT token
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = verifyJWT(token);
        if (!payload?.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Verify user has provider role
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user || user.role !== 'provider') {
            return NextResponse.json({ error: 'Provider role required' }, { status: 403 });
        }

        // 3. Find the inventory account
        const account = await prisma.inventoryAccount.findUnique({
            where: { id: params.accountId },
            include: {
                product: {
                    select: {
                        providerId: true,
                    },
                },
                slots: true,
            },
        });

        if (!account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        // 4. Verify the provider owns this product
        if (account.product.providerId !== user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // 5. Check if any slots are sold
        const soldSlots = account.slots.filter(slot => slot.status === 'sold');
        if (soldSlots.length > 0) {
            return NextResponse.json(
                { error: 'Cannot delete account with sold slots' },
                { status: 400 }
            );
        }

        // 6. Delete slots first, then account (transaction)
        await prisma.$transaction(async (tx) => {
            // Delete all slots
            await tx.inventorySlot.deleteMany({
                where: { accountId: params.accountId },
            });

            // Delete the account
            await tx.inventoryAccount.delete({
                where: { id: params.accountId },
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Account deleted successfully',
        });

    } catch (error: unknown) {
        console.error('Error deleting inventory account:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
