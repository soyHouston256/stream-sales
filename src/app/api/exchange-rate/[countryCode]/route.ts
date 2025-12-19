import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/exchange-rate/[countryCode]
 * Get exchange rate for a specific country (public endpoint for authenticated users)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ countryCode: string }> }
) {
    try {
        // Verify user is authenticated
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = verifyJWT(token);
        if (!payload?.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const { countryCode } = await params;

        if (!countryCode || countryCode.length !== 2) {
            return NextResponse.json(
                { error: 'Invalid country code' },
                { status: 400 }
            );
        }

        const exchangeRate = await prisma.exchangeRate.findUnique({
            where: {
                countryCode: countryCode.toUpperCase(),
                isActive: true,
            },
        });

        if (!exchangeRate) {
            // Return default rate of 1 (USD) if not found
            return NextResponse.json({
                data: {
                    countryCode: countryCode.toUpperCase(),
                    countryName: 'Unknown',
                    currencyCode: 'USD',
                    currencyName: 'US Dollar',
                    rate: '1',
                    isDefault: true,
                },
            });
        }

        return NextResponse.json({
            data: {
                countryCode: exchangeRate.countryCode,
                countryName: exchangeRate.countryName,
                currencyCode: exchangeRate.currencyCode,
                currencyName: exchangeRate.currencyName,
                rate: exchangeRate.rate.toString(),
                isDefault: false,
            },
        });
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
