import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

// Map phone country codes to ISO codes
const phoneToIsoMap: Record<string, string> = {
    '+51': 'PE', // Peru
    '+52': 'MX', // Mexico
    '+54': 'AR', // Argentina
    '+55': 'BR', // Brazil
    '+56': 'CL', // Chile
    '+57': 'CO', // Colombia
    '+58': 'VE', // Venezuela
    '+591': 'BO', // Bolivia
    '+593': 'EC', // Ecuador
    '+595': 'PY', // Paraguay
    '+598': 'UY', // Uruguay
    '+1': 'US', // USA
};

function normalizeCountryCode(code: string): string {
    if (code.startsWith('+')) {
        return phoneToIsoMap[code] || code;
    }
    return code.toUpperCase();
}

interface PaymentMethod {
    id: string;
    name: string;
    type: 'mobile' | 'bank' | 'crypto';
    color: string;
    enabled: boolean;
    phone?: string;
    qrImage?: string;
    walletAddress?: string;
    bankName?: string;
    accountNumber?: string;
    cci?: string;
    holderName?: string;
    instructions?: string;
}

/**
 * GET /api/payment-config/[countryCode]
 * Get the payment method configuration for a specific country
 * Only returns methods if the assigned validator is APPROVED
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { countryCode: string } }
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

        const { countryCode: rawCode } = params;

        if (!rawCode) {
            return NextResponse.json(
                { error: 'Country code is required' },
                { status: 400 }
            );
        }

        // Normalize the country code
        const countryCode = normalizeCountryCode(decodeURIComponent(rawCode));

        if (countryCode.length !== 2) {
            return NextResponse.json(
                { error: `Invalid country code: ${rawCode}. Could not convert to ISO format.` },
                { status: 400 }
            );
        }

        // Find config for this country WITH validator approval check
        const config = await prisma.paymentMethodConfig.findUnique({
            where: { countryCode: countryCode },
            include: {
                validator: {
                    select: {
                        id: true,
                        paymentValidatorProfile: {
                            select: {
                                status: true,
                                assignedCountry: true,
                            }
                        }
                    }
                }
            },
        });

        if (!config) {
            return NextResponse.json(
                {
                    error: 'No payment configuration found for this country',
                    code: 'NO_CONFIG',
                    requestedCode: countryCode
                },
                { status: 404 }
            );
        }

        // CRITICAL: Check if validator is approved
        const validatorProfile = config.validator?.paymentValidatorProfile;
        if (!validatorProfile || validatorProfile.status !== 'approved') {
            return NextResponse.json(
                {
                    error: 'Payment methods are not available for this country. The payment validator is pending approval.',
                    code: 'VALIDATOR_NOT_APPROVED',
                },
                { status: 404 }
            );
        }

        // Filter only enabled methods
        const methods = (config.methods as unknown as PaymentMethod[]).filter(m => m.enabled);

        if (methods.length === 0) {
            return NextResponse.json(
                {
                    error: 'No payment methods are enabled for this country',
                    code: 'NO_ENABLED_METHODS',
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            data: {
                countryCode: config.countryCode,
                methods: methods,
            },
        });
    } catch (error) {
        console.error('Error fetching payment config:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
