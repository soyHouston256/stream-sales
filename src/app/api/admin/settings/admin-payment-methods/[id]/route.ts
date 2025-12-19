import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

// PUT /api/admin/settings/admin-payment-methods/[id] - Update a payment method
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = verifyJWT(token);
        if (!payload?.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Verify admin role
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { role: true },
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { id } = params;

        // Check if method exists
        const existingMethod = await prisma.adminPaymentMethod.findUnique({
            where: { id },
        });

        if (!existingMethod) {
            return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
        }

        const body = await request.json();
        const {
            name,
            type,
            enabled,
            color,
            phone,
            qrImage,
            bankName,
            accountNumber,
            cci,
            holderName,
            walletAddress,
            network,
            instructions,
        } = body;

        if (type && !['mobile', 'bank', 'crypto'].includes(type)) {
            return NextResponse.json(
                { error: 'Type must be mobile, bank, or crypto' },
                { status: 400 }
            );
        }

        const method = await prisma.adminPaymentMethod.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(type !== undefined && { type }),
                ...(enabled !== undefined && { enabled }),
                ...(color !== undefined && { color }),
                ...(phone !== undefined && { phone }),
                ...(qrImage !== undefined && { qrImage }),
                ...(bankName !== undefined && { bankName }),
                ...(accountNumber !== undefined && { accountNumber }),
                ...(cci !== undefined && { cci }),
                ...(holderName !== undefined && { holderName }),
                ...(walletAddress !== undefined && { walletAddress }),
                ...(network !== undefined && { network }),
                ...(instructions !== undefined && { instructions }),
            },
        });

        return NextResponse.json({ data: method });
    } catch (error) {
        console.error('Error updating admin payment method:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/admin/settings/admin-payment-methods/[id] - Delete a payment method
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = verifyJWT(token);
        if (!payload?.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Verify admin role
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { role: true },
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { id } = params;

        // Check if method exists
        const existingMethod = await prisma.adminPaymentMethod.findUnique({
            where: { id },
        });

        if (!existingMethod) {
            return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
        }

        await prisma.adminPaymentMethod.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Payment method deleted successfully' });
    } catch (error) {
        console.error('Error deleting admin payment method:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
