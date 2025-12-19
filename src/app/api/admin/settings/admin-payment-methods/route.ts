import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

// GET /api/admin/settings/admin-payment-methods - List all admin payment methods
export async function GET(request: NextRequest) {
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

        const methods = await prisma.adminPaymentMethod.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ data: methods });
    } catch (error) {
        console.error('Error fetching admin payment methods:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/admin/settings/admin-payment-methods - Create a new payment method
export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const {
            name,
            type,
            enabled = true,
            color = '#3B82F6',
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

        if (!name || !type) {
            return NextResponse.json(
                { error: 'Name and type are required' },
                { status: 400 }
            );
        }

        if (!['mobile', 'bank', 'crypto'].includes(type)) {
            return NextResponse.json(
                { error: 'Type must be mobile, bank, or crypto' },
                { status: 400 }
            );
        }

        const method = await prisma.adminPaymentMethod.create({
            data: {
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
            },
        });

        return NextResponse.json({ data: method }, { status: 201 });
    } catch (error) {
        console.error('Error creating admin payment method:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
