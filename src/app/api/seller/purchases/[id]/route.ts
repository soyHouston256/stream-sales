import { NextRequest, NextResponse } from 'next/server';
import { prisma as globalPrisma } from '@/infrastructure/database/prisma';
import { PrismaClient } from '@prisma/client';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { computeEffectiveFields } from '@/lib/utils/purchase-helpers';

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
 * ... (comments preserved)
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

    // 3. Get purchase details (now Order)
    // We assume ID passed is an Order ID
    const order = await prisma.order.findFirst({
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
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Purchase not found or access denied' },
        { status: 404 }
      );
    }

    // Map Order to legacy Purchase response structure
    // Taking the first item as the main product for this view
    const firstItem = order.items[0];
    const product = firstItem?.variant.product;
    const provider = product?.provider;

    if (!firstItem || !product || !provider) {
      return NextResponse.json(
        { error: 'Invalid order data' },
        { status: 500 }
      );
    }

    // 4. Compute effective fields (adapted)
    // Legacy helper might expect 'completed', Order uses 'paid'
    const status = order.status === 'paid' ? 'completed' : order.status;

    // Mock dispute for now as Order doesn't have direct dispute relation yet
    const dispute = null;

    const { effectiveStatus, effectiveAmount } = computeEffectiveFields({
      status: status,
      amount: order.totalAmount,
      dispute: dispute,
    });

    // 5. Return purchase details
    return NextResponse.json({
      id: order.id,
      sellerId: order.userId,
      productId: product.id,
      providerId: provider.id,
      amount: order.totalAmount.toString(),
      status: status,
      createdAt: order.createdAt.toISOString(),
      completedAt: status === 'completed' ? order.createdAt.toISOString() : undefined, // Approx
      refundedAt: undefined,
      // Computed fields
      effectiveStatus,
      effectiveAmount,
      // Dispute info
      dispute: undefined,
      product: {
        id: product.id,
        category: product.category,
        name: product.name,
        description: product.description || '',
        // Legacy fields might be missing in new Product model, mocking or omitting
        accountEmail: 'N/A',
        accountPassword: 'N/A',
        accountDetails: {},
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
