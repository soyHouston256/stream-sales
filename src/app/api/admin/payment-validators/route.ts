import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/payment-validators
 * List all payment validators with their approval status
 */
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
        const admin = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { role: true },
        });

        if (!admin || admin.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Get query params for filtering
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        // Find all payment validators with their profiles
        const validators = await prisma.user.findMany({
            where: {
                role: 'payment_validator',
                ...(status && {
                    paymentValidatorProfile: {
                        status: status,
                    },
                }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                paymentValidatorProfile: {
                    select: {
                        id: true,
                        status: true,
                        assignedCountry: true,
                        applicationNote: true,
                        rejectionReason: true,
                        approvedBy: true,
                        approvedAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Count by status
        const counts = await prisma.paymentValidatorProfile.groupBy({
            by: ['status'],
            _count: true,
        });

        const statusCounts = {
            pending: 0,
            approved: 0,
            rejected: 0,
            suspended: 0,
        };
        counts.forEach((c) => {
            statusCounts[c.status as keyof typeof statusCounts] = c._count;
        });

        // Count validators without profile (new, need profile creation)
        const withoutProfile = validators.filter(v => !v.paymentValidatorProfile).length;

        return NextResponse.json({
            data: validators,
            counts: {
                ...statusCounts,
                withoutProfile,
                total: validators.length,
            },
        });
    } catch (error) {
        console.error('Error fetching payment validators:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
