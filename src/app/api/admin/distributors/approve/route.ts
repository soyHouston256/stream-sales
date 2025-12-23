import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/admin/distributors/approve
 * 
 * Approves a user as a distributor by creating an AffiliateProfile
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
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

        // Parse request body
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { affiliateProfile: true },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if user already has an affiliate profile
        if (user.affiliateProfile) {
            // If already approved or active, return error
            if (user.affiliateProfile.status === 'approved' || user.affiliateProfile.status === 'active') {
                return NextResponse.json(
                    { error: 'User is already an approved distributor' },
                    { status: 400 }
                );
            }

            // If status is pending, update it to approved
            if (user.affiliateProfile.status === 'pending') {
                const updatedProfile = await prisma.affiliateProfile.update({
                    where: { id: user.affiliateProfile.id },
                    data: {
                        status: 'approved',
                        approvedBy: decoded.userId,
                        approvedAt: new Date(),
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                username: true,
                                role: true,
                            },
                        },
                    },
                });

                // Update user role to affiliate if they're currently just 'user' or 'seller'
                if (user.role === 'user' || user.role === 'seller') {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { role: 'affiliate' },
                    });
                }

                return NextResponse.json({
                    success: true,
                    message: 'Distributor application approved successfully',
                    data: updatedProfile,
                });
            }

            // If status is rejected, allow re-approval
            if (user.affiliateProfile.status === 'rejected') {
                const updatedProfile = await prisma.affiliateProfile.update({
                    where: { id: user.affiliateProfile.id },
                    data: {
                        status: 'approved',
                        approvedBy: decoded.userId,
                        approvedAt: new Date(),
                        rejectionReason: null, // Clear rejection reason
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                username: true,
                                role: true,
                            },
                        },
                    },
                });

                // Update user role to affiliate if they're currently just 'user' or 'seller'
                if (user.role === 'user' || user.role === 'seller') {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { role: 'affiliate' },
                    });
                }

                return NextResponse.json({
                    success: true,
                    message: 'Distributor re-approved successfully',
                    data: updatedProfile,
                });
            }
        }

        // User doesn't have an affiliate profile, create a new one
        // Generate unique referral code
        const generateReferralCode = () => {
            // Use username or first part of email + random string
            const base = (user.username || user.email.split('@')[0])
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .substring(0, 6);
            const random = Math.random().toString(36).substring(2, 6).toUpperCase();
            return `${base}${random}`;
        };

        let referralCode = generateReferralCode();

        // Ensure referral code is unique
        let existingProfile = await prisma.affiliateProfile.findUnique({
            where: { referralCode },
        });

        // Keep generating until we get a unique code
        while (existingProfile) {
            referralCode = generateReferralCode();
            existingProfile = await prisma.affiliateProfile.findUnique({
                where: { referralCode },
            });
        }

        // Create affiliate profile
        const affiliateProfile = await prisma.affiliateProfile.create({
            data: {
                userId: user.id,
                referralCode,
                status: 'approved',
                tier: 'bronze',
                approvedBy: decoded.userId,
                approvedAt: new Date(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true,
                        role: true,
                    },
                },
            },
        });

        // Update user role to affiliate if they're currently just 'user'
        if (user.role === 'user') {
            await prisma.user.update({
                where: { id: user.id },
                data: { role: 'affiliate' },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'User approved as distributor successfully',
            data: affiliateProfile,
        });
    } catch (error: any) {
        console.error('Error approving distributor:', error);
        return NextResponse.json(
            { error: 'Failed to approve distributor', details: error.message },
            { status: 500 }
        );
    }
}
