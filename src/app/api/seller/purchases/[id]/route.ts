import { NextRequest, NextResponse } from 'next/server';
import { prisma as globalPrisma } from '@/infrastructure/database/prisma';
import { PrismaClient } from '@prisma/client';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { computeEffectiveFields } from '@/lib/utils/purchase-helpers';
import { safeDecrypt } from '@/infrastructure/security/encryption';
import { logCredentialAccess } from '@/infrastructure/security/audit';

// Define minimal OrderDelegate interface to fix type resolution
interface OrderDelegate {
  findFirst(args?: {
    where?: any;
    include?: any;
  }): Promise<any>;
}

// Force type recognition for order delegate
const prisma = globalPrisma as unknown as PrismaClient & {
  order: OrderDelegate;
};

export const dynamic = 'force-dynamic';

/**
 * GET /api/seller/purchases/:id
 * 
 * Get purchase details including decrypted credentials for the owner.
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

    // 2. Verify user has seller role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'seller') {
      return NextResponse.json(
        { error: 'Access denied. Seller role required.' },
        { status: 403 }
      );
    }

    // 3. Get purchase details - try Order ID first, then OrderItem ID
    let order = await prisma.order.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Only allow seller to see their own orders
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    provider: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
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
            assignedSlot: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    });

    // If not found by Order ID, try to find by OrderItem ID
    if (!order) {
      const orderItem = await (prisma as any).orderItem.findFirst({
        where: { id: params.id },
        include: {
          order: {
            include: {
              items: {
                include: {
                  variant: {
                    include: {
                      product: {
                        include: {
                          provider: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
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
                  assignedSlot: {
                    include: {
                      account: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Verify ownership
      if (orderItem && orderItem.order.userId === user.id) {
        order = orderItem.order;
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Purchase not found or access denied' },
        { status: 404 }
      );
    }

    // Map Order to legacy Purchase response structure
    const firstItem = order.items[0];
    const product = firstItem?.variant.product;
    const provider = product?.provider;

    if (!firstItem || !product || !provider) {
      return NextResponse.json(
        { error: 'Invalid order data' },
        { status: 500 }
      );
    }

    // 4. Compute effective fields
    const status = order.status === 'paid' ? 'completed' : order.status;
    const dispute = null;

    const { effectiveStatus, effectiveAmount } = computeEffectiveFields({
      status: status,
      amount: order.totalAmount,
      dispute: dispute,
    });

    // 5. Decrypt credentials if purchase is completed
    let accountEmail = '***';
    let accountPassword = '***';
    let accountDetails: any = {};

    if (status === 'completed') {
      try {
        // Get credentials from assigned slot or product's inventory account
        const assignedSlot = firstItem.assignedSlot;
        const inventoryAccount = assignedSlot?.account || product.inventoryAccounts[0];

        if (inventoryAccount) {
          // Decrypt credentials (safeDecrypt handles legacy plaintext data)
          accountEmail = safeDecrypt(inventoryAccount.email);
          accountPassword = safeDecrypt(inventoryAccount.passwordHash);

          // If there's an assigned slot, include its profile info
          if (assignedSlot) {
            accountDetails = {
              profileName: assignedSlot.profileName,
              pin: assignedSlot.pinCode ? safeDecrypt(assignedSlot.pinCode) : null,
            };
          } else if (product.inventoryAccounts[0]?.slots?.length > 0) {
            // Include all profiles for the account
            accountDetails = {
              profiles: product.inventoryAccounts[0].slots.map((slot: any) => ({
                name: slot.profileName,
                pin: slot.pinCode ? safeDecrypt(slot.pinCode) : null,
              })),
            };
          }

          // Log credential access for audit
          await logCredentialAccess({
            userId: user.id,
            purchaseId: order.id,
            productId: product.id,
            action: 'VIEW_CREDENTIALS',
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          });
        }
      } catch (decryptError) {
        console.error('Failed to decrypt credentials:', decryptError);
        // Keep masked values if decryption fails
        accountEmail = '***';
        accountPassword = '***';

        await logCredentialAccess({
          userId: user.id,
          purchaseId: order.id,
          action: 'DECRYPT_FAILED',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: { error: 'Decryption failed' },
        });
      }
    }

    // 6. Return purchase details with decrypted credentials
    return NextResponse.json({
      id: order.id,
      sellerId: order.userId,
      productId: product.id,
      providerId: provider.id,
      amount: order.totalAmount.toString(),
      status: status,
      createdAt: order.createdAt.toISOString(),
      completedAt: status === 'completed' ? order.createdAt.toISOString() : undefined,
      refundedAt: undefined,
      effectiveStatus,
      effectiveAmount,
      dispute: undefined,
      product: {
        id: product.id,
        category: product.category,
        name: product.name,
        description: product.description || '',
        accountEmail,
        accountPassword,
        accountDetails,
      },
      provider: {
        id: provider.id,
        name: provider.name || provider.email,
        email: provider.email,
      },
    });
  } catch (error: any) {
    console.error('Error fetching purchase details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
