import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

const rejectSchema = z.object({
    reason: z.string().min(1, 'Rejection reason is required'),
});

/**
 * PUT /api/admin/payment-validators/[id]/reject
 * Reject a payment validator application
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

        // Find the validator
        const validator = await prisma.user.findUnique({
            where: { id },
            select: { id: true, role: true },
        });

        if (!validator) {
            return NextResponse.json({ error: 'Validator not found' }, { status: 404 });
        }

        if (validator.role !== 'payment_validator') {
            return NextResponse.json(
                { error: 'User is not a payment validator' },
                { status: 400 }
            );
        }

        // Parse body
        const body = await request.json();
        const validation = rejectSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { reason } = validation.data;

        // Upsert the profile
        const profile = await prisma.paymentValidatorProfile.upsert({
            where: { userId: id },
            update: {
                status: 'rejected',
                rejectionReason: reason,
                assignedCountry: null,
                approvedAt: null,
            },
            create: {
                userId: id,
                status: 'rejected',
                rejectionReason: reason,
            },
        });

        return NextResponse.json({
            message: 'Validator rejected',
            data: profile,
        });
    } catch (error) {
        console.error('Error rejecting validator:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
