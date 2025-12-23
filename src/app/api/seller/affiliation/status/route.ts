import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * GET /api/seller/affiliation/status
 * 
 * Returns the affiliation status of the current seller
 * Used to determine if seller can make wallet recharges
 */
export async function GET(request: NextRequest) {
    try {
        // Verify JWT token
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) {
            return NextResponse.json(
                { error: 'No authorization token provided' },
                { status: 401 }
            );
        }

        const decoded = verifyJWT(token);
        if (!decoded) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Check if user has an affiliation (was referred)
        const affiliation = await prisma.affiliation.findUnique({
            where: { referredUserId: decoded.userId },
            include: {
                affiliate: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // If no affiliation, user can recharge freely
        if (!affiliation) {
            return NextResponse.json({
                hasAffiliation: false,
                canRecharge: true,
            });
        }

        // If has affiliation, check approval status
        const isApproved = affiliation.approvalStatus === 'approved';

        return NextResponse.json({
            hasAffiliation: true,
            approvalStatus: affiliation.approvalStatus,
            canRecharge: isApproved,
            affiliateName: affiliation.affiliate.name,
            affiliateEmail: affiliation.affiliate.email,
            approvedAt: affiliation.approvedAt,
            rejectedAt: affiliation.rejectedAt,
            createdAt: affiliation.createdAt,
        });
    } catch (error: any) {
        console.error('Error fetching affiliation status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch affiliation status', details: error.message },
            { status: 500 }
        );
    }
}
