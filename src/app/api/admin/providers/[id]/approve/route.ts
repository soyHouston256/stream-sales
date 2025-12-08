import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { JwtService } from '@/infrastructure/auth/JwtService';

export const dynamic = 'force-dynamic';

const jwtService = new JwtService();

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        // 1. Verify Admin
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwtService.verify(token);

        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Update ProviderProfile status to 'approved'
        const updatedProfile = await prisma.providerProfile.update({
            where: { id },
            data: {
                status: 'approved',
                approvedBy: decoded.userId,
                approvedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, data: updatedProfile });
    } catch (error) {
        console.error('Error approving provider:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
