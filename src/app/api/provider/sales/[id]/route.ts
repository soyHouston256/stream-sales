import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

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
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: params.id,
        providerId: user.id, // Only allow provider to see their own sales
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: 'Sale not found or access denied' },
        { status: 404 }
      );
    }

    // 4. Return sale details
    return NextResponse.json({
      id: purchase.id,
      productId: purchase.productId,
      productName: purchase.product.name,
      productCategory: purchase.product.category,
      buyerId: purchase.sellerId,
      buyerEmail: purchase.seller.email,
      buyerName: purchase.seller.name || undefined,
      amount: purchase.amount.toString(),
      providerEarnings: purchase.providerEarnings.toString(),
      adminCommission: purchase.adminCommission.toString(),
      commissionRate: purchase.commissionRate.toString(),
      status: purchase.status,
      completedAt: purchase.completedAt?.toISOString(),
      refundedAt: purchase.refundedAt?.toISOString(),
      createdAt: purchase.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching sale details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
