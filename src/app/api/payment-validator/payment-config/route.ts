import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

const updateConfigSchema = z.object({
    // Yape
    yapeEnabled: z.boolean().optional(),
    yapePhone: z.string().optional().nullable(),
    yapeQrUrl: z.string().url().optional().nullable(),
    // Plin
    plinEnabled: z.boolean().optional(),
    plinPhone: z.string().optional().nullable(),
    plinQrUrl: z.string().url().optional().nullable(),
    // Binance
    binanceEnabled: z.boolean().optional(),
    binanceWallet: z.string().optional().nullable(),
    binanceQrUrl: z.string().url().optional().nullable(),
    // Bank
    bankEnabled: z.boolean().optional(),
    bankName: z.string().optional().nullable(),
    bankAccountNumber: z.string().optional().nullable(),
    bankCci: z.string().optional().nullable(),
    bankHolderName: z.string().optional().nullable(),
});

/**
 * GET /api/payment-validator/payment-config
 * Get the payment method configuration for the current payment_validator
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

        // Verify user is payment_validator
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, role: true, countryCode: true },
        });

        if (!user || user.role !== 'payment_validator') {
            return NextResponse.json(
                { error: 'Access denied. Payment validator role required.' },
                { status: 403 }
            );
        }

        // Get existing config or return empty
        const config = await prisma.paymentMethodConfig.findUnique({
            where: { validatorId: user.id },
        });

        return NextResponse.json({
            data: config || {
                countryCode: user.countryCode || '',
                yapeEnabled: false,
                yapePhone: null,
                yapeQrUrl: null,
                plinEnabled: false,
                plinPhone: null,
                plinQrUrl: null,
                binanceEnabled: false,
                binanceWallet: null,
                binanceQrUrl: null,
                bankEnabled: false,
                bankName: null,
                bankAccountNumber: null,
                bankCci: null,
                bankHolderName: null,
            },
            userCountryCode: user.countryCode,
        });
    } catch (error) {
        console.error('Error fetching payment config:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PUT /api/payment-validator/payment-config
 * Create or update the payment method configuration
 */
export async function PUT(request: NextRequest) {
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

        // Verify user is payment_validator
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, role: true, countryCode: true },
        });

        if (!user || user.role !== 'payment_validator') {
            return NextResponse.json(
                { error: 'Access denied. Payment validator role required.' },
                { status: 403 }
            );
        }

        if (!user.countryCode) {
            return NextResponse.json(
                { error: 'You must have a country code assigned to configure payment methods.' },
                { status: 400 }
            );
        }

        // Parse and validate body
        const body = await request.json();
        const validation = updateConfigSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validation.error.errors },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Upsert config
        const config = await prisma.paymentMethodConfig.upsert({
            where: { validatorId: user.id },
            update: {
                ...data,
                updatedAt: new Date(),
            },
            create: {
                validatorId: user.id,
                countryCode: user.countryCode,
                ...data,
            },
        });

        return NextResponse.json({ data: config });
    } catch (error: any) {
        console.error('Error updating payment config:', error);

        // Handle unique constraint error (another validator already has this country)
        if (error.code === 'P2002' && error.meta?.target?.includes('countryCode')) {
            return NextResponse.json(
                { error: 'Another payment validator is already assigned to this country.' },
                { status: 409 }
            );
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
