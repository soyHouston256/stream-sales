import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { normalizeCountryCode } from '@/lib/utils/countryCode';

export const dynamic = 'force-dynamic';

// Schema for a single payment method
const paymentMethodSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['mobile', 'bank', 'crypto']),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
    enabled: z.boolean(),
    phone: z.string().optional(),
    qrImage: z.string().optional(), // Base64 image
    walletAddress: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    cci: z.string().optional(),
    holderName: z.string().optional(),
    instructions: z.string().optional(),
});

const updateConfigSchema = z.object({
    methods: z.array(paymentMethodSchema),
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

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

        // Verify user is payment_validator with profile
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                role: true,
                paymentValidatorProfile: {
                    select: {
                        status: true,
                        assignedCountry: true,
                    }
                }
            },
        });

        if (!user || user.role !== 'payment_validator') {
            return NextResponse.json(
                { error: 'Access denied. Payment validator role required.' },
                { status: 403 }
            );
        }

        const profile = user.paymentValidatorProfile;

        // Return status info for all validators (approved or not)
        if (!profile || profile.status !== 'approved') {
            return NextResponse.json({
                approved: false,
                status: profile?.status || 'pending',
                data: { methods: [] },
                userCountryCode: null,
            });
        }

        // Get existing config or return empty
        const config = await prisma.paymentMethodConfig.findUnique({
            where: { validatorId: user.id },
        });

        return NextResponse.json({
            approved: true,
            status: 'approved',
            data: {
                methods: config ? (config.methods as PaymentMethod[]) : [],
            },
            userCountryCode: profile.assignedCountry,
        });
    } catch (error) {
        console.error('Error fetching payment config:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PUT /api/payment-validator/payment-config
 * Create or update the payment method configuration with dynamic methods
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

        // Verify user is approved payment_validator
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                role: true,
                paymentValidatorProfile: {
                    select: {
                        status: true,
                        assignedCountry: true,
                    }
                }
            },
        });

        if (!user || user.role !== 'payment_validator') {
            return NextResponse.json(
                { error: 'Access denied. Payment validator role required.' },
                { status: 403 }
            );
        }

        const profile = user.paymentValidatorProfile;

        // Must be approved to update config
        if (!profile || profile.status !== 'approved') {
            return NextResponse.json(
                { error: 'Your account must be approved by an administrator before you can configure payment methods.' },
                { status: 403 }
            );
        }

        if (!profile.assignedCountry) {
            return NextResponse.json(
                { error: 'No country has been assigned to your account. Contact an administrator.' },
                { status: 400 }
            );
        }

        // Normalize country code to ISO format
        const countryCode = normalizeCountryCode(profile.assignedCountry);
        if (!countryCode) {
            return NextResponse.json(
                { error: `Invalid country code: ${profile.assignedCountry}` },
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

        const { methods } = validation.data;

        // Upsert config using normalized country code
        const config = await prisma.paymentMethodConfig.upsert({
            where: { validatorId: user.id },
            update: {
                methods: methods as unknown as any,
                countryCode: countryCode, // Use normalized ISO country code
                updatedAt: new Date(),
            },
            create: {
                validatorId: user.id,
                countryCode: countryCode, // Use normalized ISO country code
                methods: methods as unknown as any,
            },
        });

        return NextResponse.json({
            data: {
                methods: config.methods as PaymentMethod[]
            }
        });
    } catch (error: any) {
        console.error('Error updating payment config:', error);

        // Handle unique constraint error
        if (error.code === 'P2002' && error.meta?.target?.includes('countryCode')) {
            return NextResponse.json(
                { error: 'Another payment validator is already assigned to this country.' },
                { status: 409 }
            );
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
