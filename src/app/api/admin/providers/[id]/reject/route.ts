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
        const body = await request.json();
        const { rejectionReason } = body;

        if (!rejectionReason) {
            return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }

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

        // 2. Update ProviderProfile status to 'rejected'
        const updatedProfile = await prisma.providerProfile.update({
            where: { id },
            data: {
                status: 'rejected',
                rejectionReason: rejectionReason,
                // We might want to keep approvedBy/At null, or track who rejected it?
                // Let's use approvedBy as "reviewedBy" effectively, or just leave it null.
                // Schema comment said "Admin ID", doesn't specify strictly approval.
                // Let's leave approvedBy null for rejection to avoid confusion, or add rejectedBy field later.
            },
        });

        return NextResponse.json({ success: true, data: updatedProfile });
    } catch (error) {
        console.error('Error rejecting provider:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
