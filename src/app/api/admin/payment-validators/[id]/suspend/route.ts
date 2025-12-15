import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/payment-validators/[id]/suspend
 * Suspend an approved payment validator
 */
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
        const admin = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, role: true },
        });

        if (!admin || admin.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const { id } = params;

        // Find the validator profile
        const profile = await prisma.paymentValidatorProfile.findUnique({
            where: { userId: id },
        });

        if (!profile) {
            return NextResponse.json({ error: 'Validator profile not found' }, { status: 404 });
        }

        // Toggle suspend status
        const newStatus = profile.status === 'suspended' ? 'approved' : 'suspended';

        const updated = await prisma.paymentValidatorProfile.update({
            where: { userId: id },
            data: { status: newStatus },
        });

        return NextResponse.json({
            message: newStatus === 'suspended' ? 'Validator suspended' : 'Validator reactivated',
            data: updated,
        });
    } catch (error) {
        console.error('Error suspending validator:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
