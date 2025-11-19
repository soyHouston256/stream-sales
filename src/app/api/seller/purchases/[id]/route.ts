import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { computeEffectiveFields } from '@/lib/utils/purchase-helpers';

/**
 * GET /api/seller/purchases/:id
 *
 * Obtener detalles completos de una compra específica.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "id": "purchase_123",
 *   "sellerId": "user_456",
 *   "productId": "prod_789",
 *   "providerId": "provider_012",
 *   "amount": "15.99",
 *   "status": "completed",
 *   "createdAt": "2025-11-15T10:30:00Z",
 *   "completedAt": "2025-11-15T10:30:01Z",
 *   "product": {
 *     "id": "prod_789",
 *     "category": "netflix",
 *     "name": "Netflix Premium",
 *     "description": "4K Ultra HD, 4 screens",
 *     "accountEmail": "account@netflix.com",
 *     "accountPassword": "password123",
 *     "accountDetails": {}
 *   },
 *   "provider": {
 *     "id": "provider_012",
 *     "name": "John Doe",
 *     "email": "john@example.com"
 *   }
 * }
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: No es el dueño de la compra
 * - 404 Not Found: Compra no encontrada
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

    // 3. Get purchase details
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: params.id,
        sellerId: user.id, // Only allow seller to see their own purchases
      },
      include: {
        product: true,
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        dispute: {
          select: {
            id: true,
            status: true,
            resolutionType: true,
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found or access denied' },
        { status: 404 }
      );
    }

    // 4. Compute effective fields
    const { effectiveStatus, effectiveAmount } = computeEffectiveFields({
      status: purchase.status,
      amount: purchase.amount,
      dispute: purchase.dispute,
    });

    // 5. Return purchase details
    return NextResponse.json({
      id: purchase.id,
      sellerId: purchase.sellerId,
      productId: purchase.productId,
      providerId: purchase.providerId,
      amount: purchase.amount.toString(),
      status: purchase.status,
      createdAt: purchase.createdAt.toISOString(),
      completedAt: purchase.completedAt?.toISOString(),
      refundedAt: purchase.refundedAt?.toISOString(),
      // Computed fields
      effectiveStatus,
      effectiveAmount,
      // Dispute info
      dispute: purchase.dispute
        ? {
            id: purchase.dispute.id,
            status: purchase.dispute.status,
            resolutionType: purchase.dispute.resolutionType,
          }
        : undefined,
      product: {
        id: purchase.product.id,
        category: purchase.product.category,
        name: purchase.product.name,
        description: purchase.product.description || '',
        accountEmail: purchase.product.accountEmail,
        accountPassword: purchase.product.accountPassword,
        accountDetails: purchase.product.accountDetails,
      },
      provider: {
        id: purchase.provider.id,
        name: purchase.provider.name || purchase.provider.email,
        email: purchase.provider.email,
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
