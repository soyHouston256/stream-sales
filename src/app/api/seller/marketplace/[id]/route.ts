import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/seller/marketplace/:id
 *
 * Obtener detalles de un producto específico del marketplace.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "id": "prod_123",
 *   "providerId": "user_456",
 *   "providerName": "John Doe",
 *   "category": "netflix",
 *   "name": "Netflix Premium",
 *   "description": "4K Ultra HD, 4 screens",
 *   "price": "15.99",
 *   "status": "available",
 *   "createdAt": "2025-11-15T10:30:00Z"
 * }
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de seller
 * - 404 Not Found: Producto no encontrado o no disponible
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

    // 3. Get product details
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        status: 'available', // Solo productos disponibles
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or not available' },
        { status: 404 }
      );
    }

    // 4. Return product details
    return NextResponse.json({
      id: product.id,
      providerId: product.providerId,
      providerName: product.provider.name || product.provider.email,
      category: product.category,
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      status: product.status,
      createdAt: product.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching marketplace product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
