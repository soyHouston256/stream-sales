import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/admin/distributors/eligible
 * 
 * Lists users who are eligible to become distributors
 * Criteria: Users with role 'user' or 'seller' who don't have an AffiliateProfile yet
 */
export async function GET(request: NextRequest) {
    try {
        // Verify admin authorization
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) {
            return NextResponse.json(
                { error: 'No authorization token provided' },
                { status: 401 }
            );
        }

        const decoded = verifyJWT(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 403 }
            );
        }

        // Fetch users who are eligible to become distributors
        // Only users with role 'affiliate' (partner) who don't have an affiliate profile yet
        // Note: Users might have 'affiliate' role but no profile if it was deleted or never created
        const eligibleUsers = await prisma.user.findMany({
            where: {
                role: 'affiliate', // Only show partners/affiliates
                affiliateProfile: null, // Don't have an affiliate profile yet
            },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                role: true,
                phoneNumber: true,
                countryCode: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Fetch pending applications
        const pendingApplications = await prisma.affiliateProfile.findMany({
            where: {
                status: 'pending',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true,
                        role: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Also fetch current distributors for reference
        const currentDistributors = await prisma.affiliateProfile.findMany({
            where: {
                status: {
                    in: ['approved', 'active'],
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true,
                        role: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                approvedAt: 'desc',
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                eligibleUsers,
                pendingApplications,
                currentDistributors,
                stats: {
                    eligibleCount: eligibleUsers.length,
                    pendingCount: pendingApplications.length,
                    distributorCount: currentDistributors.length,
                },
            },
        });
    } catch (error: any) {
        console.error('Error fetching eligible users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch eligible users', details: error.message },
            { status: 500 }
        );
    }
}
