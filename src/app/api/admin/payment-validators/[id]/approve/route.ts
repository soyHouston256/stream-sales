import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

const approveSchema = z.object({
    assignedCountry: z.string().length(2, 'Country code must be 2 characters'),
});

const rejectSchema = z.object({
    reason: z.string().min(1, 'Rejection reason is required'),
});

/**
 * PUT /api/admin/payment-validators/[id]/approve
 * Approve a payment validator and assign them to a country
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
            select: { id: true, role: true, paymentValidatorProfile: true },
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
        const validation = approveSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { assignedCountry } = validation.data;

        // Check if country is already assigned to another validator
        const existingAssignment = await prisma.paymentValidatorProfile.findFirst({
            where: {
                assignedCountry: assignedCountry.toUpperCase(),
                status: 'approved',
                NOT: { userId: id },
            },
        });

        if (existingAssignment) {
            return NextResponse.json(
                { error: `Country ${assignedCountry} is already assigned to another validator` },
                { status: 409 }
            );
        }

        // Upsert the profile (create if doesn't exist, update if exists)
        const profile = await prisma.paymentValidatorProfile.upsert({
            where: { userId: id },
            update: {
                status: 'approved',
                assignedCountry: assignedCountry.toUpperCase(),
                approvedBy: admin.id,
                approvedAt: new Date(),
                rejectionReason: null,
            },
            create: {
                userId: id,
                status: 'approved',
                assignedCountry: assignedCountry.toUpperCase(),
                approvedBy: admin.id,
                approvedAt: new Date(),
            },
        });

        // Also update user's countryCode to match assigned country
        await prisma.user.update({
            where: { id },
            data: { countryCode: assignedCountry.toUpperCase() },
        });

        return NextResponse.json({
            message: 'Validator approved successfully',
            data: profile,
        });
    } catch (error) {
        console.error('Error approving validator:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
