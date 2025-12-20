import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { Prisma } from '@prisma/client';
import { isPrismaError, logError } from '@/lib/utils/error-utils';

export const dynamic = 'force-dynamic';

// Schema for creating/updating exchange rate
const exchangeRateSchema = z.object({
    countryCode: z.string().length(2, 'Country code must be 2 characters'),
    countryName: z.string().min(2, 'Country name is required'),
    currencyCode: z.string().length(3, 'Currency code must be 3 characters'),
    currencyName: z.string().min(2, 'Currency name is required'),
    rate: z.number().positive('Rate must be positive'),
    isActive: z.boolean().optional().default(true),
});

// Middleware to verify admin role
async function verifyAdmin(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);
    const payload = verifyJWT(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true },
    });

    if (user?.role !== 'admin') return null;
    return user;
}

/**
 * GET /api/admin/settings/exchange-rates
 * Get all exchange rates
 */
export async function GET(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const exchangeRates = await prisma.exchangeRate.findMany({
            orderBy: [
                { isActive: 'desc' },
                { countryName: 'asc' },
            ],
        });

        return NextResponse.json({
            data: exchangeRates.map(er => ({
                ...er,
                rate: er.rate.toString(),
            })),
        });
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/settings/exchange-rates
 * Create a new exchange rate
 */
export async function POST(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = exchangeRateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { countryCode, countryName, currencyCode, currencyName, rate, isActive } = validation.data;

        // Check if country already exists
        const existing = await prisma.exchangeRate.findUnique({
            where: { countryCode: countryCode.toUpperCase() },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Exchange rate for this country already exists' },
                { status: 409 }
            );
        }

        const exchangeRate = await prisma.exchangeRate.create({
            data: {
                countryCode: countryCode.toUpperCase(),
                countryName,
                currencyCode: currencyCode.toUpperCase(),
                currencyName,
                rate,
                isActive,
            },
        });

        return NextResponse.json(
            { data: { ...exchangeRate, rate: exchangeRate.rate.toString() } },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating exchange rate:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/settings/exchange-rates
 * Update an existing exchange rate
 */
export async function PUT(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const validation = exchangeRateSchema.partial().safeParse(data);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validation.error.errors },
                { status: 400 }
            );
        }

        const updateData: Prisma.ExchangeRateUpdateInput = {};
        if (validation.data.countryCode) updateData.countryCode = validation.data.countryCode.toUpperCase();
        if (validation.data.countryName) updateData.countryName = validation.data.countryName;
        if (validation.data.currencyCode) updateData.currencyCode = validation.data.currencyCode.toUpperCase();
        if (validation.data.currencyName) updateData.currencyName = validation.data.currencyName;
        if (validation.data.rate !== undefined) updateData.rate = validation.data.rate;
        if (validation.data.isActive !== undefined) updateData.isActive = validation.data.isActive;

        const exchangeRate = await prisma.exchangeRate.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({
            data: { ...exchangeRate, rate: exchangeRate.rate.toString() },
        });
    } catch (error: unknown) {
        if (isPrismaError(error) && error.code === 'P2025') {
            return NextResponse.json({ error: 'Exchange rate not found' }, { status: 404 });
        }
        logError('admin/settings/exchange-rates/PUT', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/settings/exchange-rates
 * Delete an exchange rate (body: { id: string })
 */
export async function DELETE(request: NextRequest) {
    try {
        const admin = await verifyAdmin(request);
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await prisma.exchangeRate.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        if (isPrismaError(error) && error.code === 'P2025') {
            return NextResponse.json({ error: 'Exchange rate not found' }, { status: 404 });
        }
        logError('admin/settings/exchange-rates/DELETE', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
