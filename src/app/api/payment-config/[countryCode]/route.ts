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
    // If it starts with +, it's a phone code - convert to ISO
    if (code.startsWith('+')) {
        return phoneToIsoMap[code] || code;
    }
    // Already an ISO code
    return code.toUpperCase();
}

/**
 * GET /api/payment-config/[countryCode]
 * Get the payment method configuration for a specific country
 * Used by RechargeDialog to load payment methods dynamically
 * Accepts both ISO codes (PE) and phone codes (+51)
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

        // Normalize the country code (convert +51 to PE, etc.)
        const countryCode = normalizeCountryCode(decodeURIComponent(rawCode));

        if (countryCode.length !== 2) {
            return NextResponse.json(
                { error: `Invalid country code: ${rawCode}. Could not convert to ISO format.` },
                { status: 400 }
            );
        }

        // Find config for this country
        const config = await prisma.paymentMethodConfig.findUnique({
            where: { countryCode: countryCode },
            select: {
                countryCode: true,
                yapeEnabled: true,
                yapePhone: true,
                yapeQrUrl: true,
                plinEnabled: true,
                plinPhone: true,
                plinQrUrl: true,
                binanceEnabled: true,
                binanceWallet: true,
                binanceQrUrl: true,
                bankEnabled: true,
                bankName: true,
                bankAccountNumber: true,
                bankCci: true,
                bankHolderName: true,
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

        // Build available methods list
        const availableMethods = [];
        if (config.yapeEnabled) availableMethods.push('yape');
        if (config.plinEnabled) availableMethods.push('plin');
        if (config.binanceEnabled) availableMethods.push('binance');
        if (config.bankEnabled) availableMethods.push('banco');

        return NextResponse.json({
            data: {
                countryCode: config.countryCode,
                availableMethods,
                yape: config.yapeEnabled ? {
                    phone: config.yapePhone,
                    qrUrl: config.yapeQrUrl,
                } : null,
                plin: config.plinEnabled ? {
                    phone: config.plinPhone,
                    qrUrl: config.plinQrUrl,
                } : null,
                binance: config.binanceEnabled ? {
                    wallet: config.binanceWallet,
                    qrUrl: config.binanceQrUrl,
                } : null,
                banco: config.bankEnabled ? {
                    bankName: config.bankName,
                    accountNumber: config.bankAccountNumber,
                    cci: config.bankCci,
                    holderName: config.bankHolderName,
                } : null,
            },
        });
    } catch (error) {
        console.error('Error fetching payment config:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
