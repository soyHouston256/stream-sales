import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { encrypt } from '@/infrastructure/security/encryption';

export const dynamic = 'force-dynamic';

/**
 * POST /api/provider/products/[id]/inventory
 *
 * Add inventory accounts to an existing product.
 *
 * Request Body:
 * {
 *   "accounts": [
 *     { "email": "account@example.com", "password": "pass123", "profiles": [...] }
 *   ]
 * }
 */
const addInventorySchema = z.object({
    accounts: z.array(z.object({
        email: z.string().email(),
        password: z.string().min(1),
        profiles: z.array(z.object({
            name: z.string(),
            pin: z.string().optional(),
        })).optional(),
    })).min(1),
});

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Verify JWT token
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = verifyJWT(token);
        if (!payload?.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Verify user has provider role
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user || user.role !== 'provider') {
            return NextResponse.json({ error: 'Provider role required' }, { status: 403 });
        }

        // 3. Verify product belongs to this provider
        const product = await prisma.product.findFirst({
            where: {
                id: params.id,
                providerId: user.id,
            },
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // 4. Parse and validate request body
        const body = await request.json();
        const validation = addInventorySchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { accounts } = validation.data;

        // 5. Create inventory accounts in transaction
        const createdAccounts = await prisma.$transaction(async (tx) => {
            const results = [];

            for (const accountData of accounts) {
                const hasProfiles = accountData.profiles && accountData.profiles.length > 0;
                const slotCount = hasProfiles ? accountData.profiles!.length : 1;

                // Create inventory account
                const account = await tx.inventoryAccount.create({
                    data: {
                        productId: product.id,
                        email: accountData.email,
                        passwordHash: accountData.password, // Store as-is (encryption handled elsewhere)
                        platformType: product.category,
                        totalSlots: slotCount,
                        availableSlots: slotCount,
                    },
                });

                // Create profile slots if provided
                if (hasProfiles) {
                    await tx.inventorySlot.createMany({
                        data: accountData.profiles!.map((p) => ({
                            accountId: account.id,
                            profileName: p.name,
                            pinCode: p.pin ? encrypt(p.pin) : null,
                            status: 'available',
                        })),
                    });
                }

                results.push({
                    id: account.id,
                    email: accountData.email,
                    slotsCreated: slotCount,
                });
            }

            return results;
        });

        // 6. Get updated stock count
        const stockStats = await prisma.inventoryAccount.aggregate({
            where: { productId: product.id },
            _sum: {
                totalSlots: true,
                availableSlots: true,
            },
        });

        return NextResponse.json({
            success: true,
            accountsAdded: createdAccounts.length,
            accounts: createdAccounts,
            stockTotal: stockStats._sum.totalSlots || 0,
            stockAvailable: stockStats._sum.availableSlots || 0,
        }, { status: 201 });

    } catch (error: unknown) {
        console.error('Error adding inventory:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * GET /api/provider/products/[id]/inventory
 *
 * Get inventory accounts for a product.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Verify JWT token
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = verifyJWT(token);
        if (!payload?.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Verify user has provider role
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user || user.role !== 'provider') {
            return NextResponse.json({ error: 'Provider role required' }, { status: 403 });
        }

        // 3. Verify product belongs to this provider
        const product = await prisma.product.findFirst({
            where: {
                id: params.id,
                providerId: user.id,
            },
            include: {
                inventoryAccounts: {
                    include: {
                        slots: true,
                    },
                },
            },
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // 4. Transform response
        const accounts = product.inventoryAccounts.map((account: any) => ({
            id: account.id,
            email: account.email,
            totalSlots: account.totalSlots,
            availableSlots: account.availableSlots,
            platformType: account.platformType,
            expiryDate: account.expiryDate?.toISOString() || null,
            slots: account.slots.map((slot: any) => ({
                id: slot.id,
                profileName: slot.profileName,
                status: slot.status,
            })),
        }));

        const stockTotal = accounts.reduce((sum: number, a: any) => sum + a.totalSlots, 0);
        const stockAvailable = accounts.reduce((sum: number, a: any) => sum + a.availableSlots, 0);

        return NextResponse.json({
            productId: product.id,
            productName: product.name,
            stockTotal,
            stockAvailable,
            accounts,
        });

    } catch (error: unknown) {
        console.error('Error fetching inventory:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
