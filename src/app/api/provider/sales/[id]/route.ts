import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/provider/sales/:id
 *
 * Obtener detalles de una venta específica.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "id": "purchase_123",
 *   "productId": "prod_456",
 *   "productName": "Netflix Premium",
 *   "productCategory": "netflix",
 *   "buyerId": "user_789",
 *   "buyerEmail": "buyer@example.com",
 *   "buyerName": "John Doe",
 *   "amount": "15.99",
 *   "providerEarnings": "15.19",
 *   "adminCommission": "0.80",
 *   "commissionRate": "0.05",
 *   "status": "completed",
 *   "completedAt": "2025-11-15T10:30:00Z",
 *   "createdAt": "2025-11-15T10:30:00Z"
 * }
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: No es el proveedor de este producto
 * - 404 Not Found: Venta no encontrada
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

    // 2. Verify user has provider role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'provider') {
      return NextResponse.json(
        { error: 'Access denied. Provider role required.' },
        { status: 403 }
      );
    }

    // 3. Get purchase details
    // 3. Get sale details (replacing purchase)
    const item = await prisma.orderItem.findFirst({
      where: {
        id: params.id,
        variant: {
          product: {
            providerId: user.id, // Only allow provider to see their own sales
          },
        },
      },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
        order: {
          include: {
            // No direct relation to User in schema provided earlier, fetching manually if needed
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Sale not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch buyer manually
    let buyerEmail = 'unknown';
    let buyerName = 'unknown';
    if (item.order.userId) {
      const buyer = await prisma.user.findUnique({
        where: { id: item.order.userId },
        select: { email: true, name: true },
      });
      if (buyer) {
        buyerEmail = buyer.email;
        buyerName = buyer.name || 'unknown';
      }
    }

    // 4. Return sale details
    return NextResponse.json({
      id: item.id,
      productId: item.variant.productId,
      productName: item.variant.product.name,
      productCategory: item.variant.product.category,
      buyerId: item.order.userId,
      buyerEmail: buyerEmail,
      buyerName: buyerName,
      amount: item.variant.price.toString(),
      providerEarnings: item.variant.price.toString(), // TODO: Commission
      adminCommission: "0",
      commissionRate: "0",
      status: item.order.status,
      completedAt: item.order.status === 'paid' ? item.order.createdAt.toISOString() : undefined,
      createdAt: item.order.createdAt.toISOString(),
      // refundedAt: ... // Not tracked in simple Order model yet
    });
  } catch (error: any) {
    console.error('Error fetching sale details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
