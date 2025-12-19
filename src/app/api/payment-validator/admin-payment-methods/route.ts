import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';

// GET /api/payment-validator/admin-payment-methods - Get enabled admin payment methods
export async function GET(request: NextRequest) {
    try {
        const auth = await verifyPaymentValidator(request);
        if (!auth.success) {
            return auth.error;
        }

        // Get only enabled payment methods
        const methods = await prisma.adminPaymentMethod.findMany({
            where: { enabled: true },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                name: true,
                type: true,
                color: true,
                phone: true,
                qrImage: true,
                bankName: true,
                accountNumber: true,
                cci: true,
                holderName: true,
                walletAddress: true,
                network: true,
                instructions: true,
            },
        });

        return NextResponse.json({ data: methods });
    } catch (error) {
        console.error('Error fetching admin payment methods:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
