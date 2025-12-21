import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { decrypt } from '@/infrastructure/security/encryption';
import { logCredentialAccess } from '@/infrastructure/security/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/affiliate/purchases/[id]/credentials
 * 
 * Get decrypted credentials for a purchased product (affiliate buyer).
 * Only the affiliate buyer can access their purchase credentials.
 * 
 * Headers:
 * - Authorization: Bearer <token>
 * 
 * Response 200:
 * {
 *   "email": "account@example.com",
 *   "password": "decryptedPassword",
 *   "profiles": [
 *     { "name": "Perfil 1", "pin": "1234" }
 *   ]
 * }
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Verify JWT token
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const payload = verifyJWT(token);

        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Verify user has affiliate role
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.role !== 'affiliate') {
            return NextResponse.json(
                { error: 'Access denied. Affiliate role required.' },
                { status: 403 }
            );
        }

        // 3. Get the purchase (OrderItem) and verify ownership
        const orderItem = await prisma.orderItem.findUnique({
            where: { id: params.id },
            include: {
                order: {
                    select: {
                        userId: true,
                        status: true,
                    },
                },
                assignedSlot: {
                    include: {
                        account: true,
                    },
                },
                variant: {
                    include: {
                        product: {
                            include: {
                                inventoryAccounts: {
                                    take: 1,
                                    include: {
                                        slots: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!orderItem) {
            return NextResponse.json(
                { error: 'Purchase not found' },
                { status: 404 }
            );
        }

        // 4. Verify the user owns this purchase
        if (orderItem.order.userId !== user.id) {
            // Log unauthorized access attempt
            await logCredentialAccess({
                userId: user.id,
                purchaseId: params.id,
                action: 'DECRYPT_FAILED',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
                metadata: { reason: 'Unauthorized access attempt' },
            });

            return NextResponse.json(
                { error: 'Access denied. You do not own this purchase.' },
                { status: 403 }
            );
        }

        // 5. Verify purchase is completed/paid
        if (orderItem.order.status !== 'paid') {
            return NextResponse.json(
                { error: 'Purchase is not completed yet' },
                { status: 400 }
            );
        }

        // 6. Get credentials from inventory
        let email = '';
        let password = '';
        let profiles: { name: string; pin: string | null }[] = [];

        // Get from assigned slot if exists, otherwise from product's inventory account
        if (orderItem.assignedSlot) {
            const account = orderItem.assignedSlot.account;

            // Decrypt credentials
            try {
                email = decrypt(account.email);
                password = decrypt(account.passwordHash);

                // Include the assigned profile
                profiles = [{
                    name: orderItem.assignedSlot.profileName || 'Perfil',
                    pin: orderItem.assignedSlot.pinCode ? decrypt(orderItem.assignedSlot.pinCode) : null,
                }];
            } catch (decryptError) {
                console.error('Decryption error:', decryptError);

                await logCredentialAccess({
                    userId: user.id,
                    purchaseId: params.id,
                    action: 'DECRYPT_FAILED',
                    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                    userAgent: request.headers.get('user-agent') || 'unknown',
                    metadata: { error: 'Decryption failed' },
                });

                return NextResponse.json(
                    { error: 'Failed to decrypt credentials' },
                    { status: 500 }
                );
            }
        } else {
            // Fallback to product's first inventory account
            const account = orderItem.variant.product.inventoryAccounts[0];

            if (account) {
                try {
                    email = decrypt(account.email);
                    password = decrypt(account.passwordHash);

                    // Include all profiles if it's a profile-based account
                    profiles = account.slots.map((slot: any) => ({
                        name: slot.profileName || 'Perfil',
                        pin: slot.pinCode ? decrypt(slot.pinCode) : null,
                    }));
                } catch (decryptError) {
                    console.error('Decryption error:', decryptError);

                    await logCredentialAccess({
                        userId: user.id,
                        purchaseId: params.id,
                        action: 'DECRYPT_FAILED',
                        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                        userAgent: request.headers.get('user-agent') || 'unknown',
                        metadata: { error: 'Decryption failed' },
                    });

                    return NextResponse.json(
                        { error: 'Failed to decrypt credentials' },
                        { status: 500 }
                    );
                }
            }
        }

        // 7. Log successful credential access
        await logCredentialAccess({
            userId: user.id,
            purchaseId: params.id,
            productId: orderItem.variant.product.id,
            action: 'VIEW_CREDENTIALS',
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
        });

        // 8. Return decrypted credentials
        return NextResponse.json({
            email,
            password,
            profiles,
            productName: orderItem.variant.product.name,
            category: orderItem.variant.product.category,
        });

    } catch (error: unknown) {
        console.error('Error fetching credentials:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
