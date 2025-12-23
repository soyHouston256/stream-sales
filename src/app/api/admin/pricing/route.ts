import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/pricing
 * Get current pricing configuration
 */
export async function GET(request: NextRequest) {
    try {
        // Verify admin authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const payload = verifyJWT(token);

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 403 }
            );
        }

        // Get active pricing config
        const config = await prisma.pricingConfig.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });

        if (!config) {
            return NextResponse.json(
                { error: 'No pricing configuration found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            distributorMarkup: parseFloat(config.distributorMarkup.toString()),
            distributorMarkupType: config.distributorMarkupType,
            platformFee: parseFloat(config.platformFee.toString()),
            platformFeeType: config.platformFeeType,
            updatedAt: config.updatedAt.toISOString(),
        });
    } catch (error: any) {
        console.error('Error fetching pricing config:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/pricing
 * Update pricing configuration
 */
export async function PUT(request: NextRequest) {
    try {
        // Verify admin authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const payload = verifyJWT(token);

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized. Admin access required.' },
                { status: 403 }
            );
        }

        // Validate request body
        const body = await request.json();
        const { distributorMarkup, distributorMarkupType, platformFee, platformFeeType } = body;

        // Validate types
        const validTypes = ['percentage', 'fixed'];
        if (!validTypes.includes(distributorMarkupType) || !validTypes.includes(platformFeeType)) {
            return NextResponse.json(
                { error: 'Invalid type. Must be "percentage" or "fixed".' },
                { status: 400 }
            );
        }

        // Validate values based on type
        if (typeof distributorMarkup !== 'number' || typeof platformFee !== 'number') {
            return NextResponse.json(
                { error: 'Markup and fee must be numbers.' },
                { status: 400 }
            );
        }

        // Percentage: 0-100, Fixed: >= 0
        if (distributorMarkupType === 'percentage' && (distributorMarkup < 0 || distributorMarkup > 100)) {
            return NextResponse.json(
                { error: 'Percentage markup must be between 0-100.' },
                { status: 400 }
            );
        }
        if (distributorMarkupType === 'fixed' && distributorMarkup < 0) {
            return NextResponse.json(
                { error: 'Fixed markup must be >= 0.' },
                { status: 400 }
            );
        }
        if (platformFeeType === 'percentage' && (platformFee < 0 || platformFee > 100)) {
            return NextResponse.json(
                { error: 'Percentage fee must be between 0-100.' },
                { status: 400 }
            );
        }
        if (platformFeeType === 'fixed' && platformFee < 0) {
            return NextResponse.json(
                { error: 'Fixed fee must be >= 0.' },
                { status: 400 }
            );
        }

        // Deactivate current config
        await prisma.pricingConfig.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });

        // Create new active config
        const newConfig = await prisma.pricingConfig.create({
            data: {
                distributorMarkup,
                distributorMarkupType,
                platformFee,
                platformFeeType,
                isActive: true,
            },
        });

        return NextResponse.json({
            distributorMarkup: parseFloat(newConfig.distributorMarkup.toString()),
            distributorMarkupType: newConfig.distributorMarkupType,
            platformFee: parseFloat(newConfig.platformFee.toString()),
            platformFeeType: newConfig.platformFeeType,
            updatedAt: newConfig.updatedAt.toISOString(),
        });
    } catch (error: any) {
        console.error('Error updating pricing config:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
