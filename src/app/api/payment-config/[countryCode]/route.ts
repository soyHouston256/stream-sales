import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { normalizeCountryCode, isoToPhoneMap } from '@/lib/utils/countryCode';

export const dynamic = 'force-dynamic';

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

        if (!countryCode || countryCode.length !== 2) {
            return NextResponse.json(
                { error: `Invalid country code: ${rawCode}. Could not convert to ISO format.` },
                { status: 400 }
            );
        }

        console.log('[payment-config] Looking up config for countryCode:', countryCode, 'raw:', rawCode);

        // Try to find config - first by normalized ISO code, then by original phone code
        let config = await prisma.paymentMethodConfig.findUnique({
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

        // If not found and original was a phone code, try with the phone code format
        if (!config && rawCode.startsWith('+')) {
            const decodedRaw = decodeURIComponent(rawCode);
            console.log('[payment-config] Trying with phone code:', decodedRaw);
            config = await prisma.paymentMethodConfig.findUnique({
                where: { countryCode: decodedRaw },
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
        }

        console.log('[payment-config] Config found:', config ? `Yes (validatorId: ${config.validatorId})` : 'No');

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
