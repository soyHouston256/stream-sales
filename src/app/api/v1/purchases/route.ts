import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../infrastructure/database/prisma';
import { PrismaWalletRepository } from '../../../../infrastructure/repositories/PrismaWalletRepository';
import { PrismaProductRepository } from '../../../../infrastructure/repositories/PrismaProductRepository';
import { PrismaPurchaseRepository } from '../../../../infrastructure/repositories/PrismaPurchaseRepository';
import { PurchaseProductUseCase } from '../../../../application/use-cases/PurchaseProductUseCase';
import { ListMyPurchasesUseCase } from '../../../../application/use-cases/ListMyPurchasesUseCase';
import { verifyJWT } from '../../../../infrastructure/auth/jwt';

/**
 * POST /api/v1/purchases
 *
 * Comprar un producto digital en el marketplace.
 *
 * Este endpoint coordina múltiples operaciones:
 * - Valida que el producto esté disponible
 * - Verifica que el seller tenga saldo suficiente
 * - Debit de seller wallet
 * - Credit a provider wallet (ganancias)
 * - Credit a admin wallet (comisión)
 * - Marca producto como SOLD
 * - Crea registro de compra (audit trail)
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Request Body:
 * {
 *   "productId": "prod_abc123"
 * }
 *
 * Response 201:
 * {
 *   "purchase": {
 *     "id": "purchase_xyz",
 *     "sellerId": "user123",
 *     "productId": "prod_abc123",
 *     "amount": "15.9900",
 *     "currency": "USD",
 *     "adminCommission": "0.7995",
 *     "providerEarnings": "15.1905",
 *     "commissionRate": 0.05,
 *     "commissionPercentage": "5.00%",
 *     "createdAt": "2025-11-15T10:30:00Z"
 *   },
 *   "product": {
 *     "id": "prod_abc123",
 *     "category": "netflix",
 *     "status": "sold",
 *     "accountEmail": "account@netflix.com",
 *     "accountPassword": "decrypted_password"
 *   },
 *   "walletBalance": "84.0100"
 * }
 *
 * Errors:
 * - 400 Bad Request: Datos inválidos
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Saldo insuficiente
 * - 404 Not Found: Producto no existe
 * - 409 Conflict: Producto ya vendido
 */

const purchaseProductSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Extraer y validar JWT token
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

    // 2. Parsear y validar request body
    const body = await request.json();
    const validationResult = purchaseProductSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { productId } = validationResult.data;

    // 3. Ejecutar PurchaseProductUseCase
    const walletRepository = new PrismaWalletRepository(prisma);
    const productRepository = new PrismaProductRepository(prisma);
    const purchaseRepository = new PrismaPurchaseRepository(prisma);

    const purchaseProductUseCase = new PurchaseProductUseCase(
      walletRepository,
      productRepository,
      purchaseRepository
    );

    const result = await purchaseProductUseCase.execute({
      sellerId: payload.userId,
      productId,
    });

    // 4. Retornar resultado exitoso
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/v1/purchases error:', error);

    // Manejo de errores específicos
    if (error.message?.includes('jwt') || error.message?.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message?.includes('Insufficient balance')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 } // Forbidden
      );
    }

    if (
      error.message?.includes('already sold') ||
      error.message?.includes('cannot be purchased')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/purchases
 *
 * Listar todas las compras realizadas por el usuario autenticado.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Query Parameters:
 * - limit?: number (default: 20)
 * - offset?: number (default: 0)
 * - startDate?: ISO date string (filtrar desde)
 * - endDate?: ISO date string (filtrar hasta)
 *
 * Response 200:
 * {
 *   "purchases": [
 *     {
 *       "id": "purchase_xyz",
 *       "sellerId": "user123",
 *       "productId": "prod_abc123",
 *       "amount": "15.9900",
 *       "currency": "USD",
 *       "adminCommission": "0.7995",
 *       "providerEarnings": "15.1905",
 *       "commissionRate": 0.05,
 *       "commissionPercentage": "5.00%",
 *       "createdAt": "2025-11-15T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "total": 10,
 *     "limit": 20,
 *     "offset": 0,
 *     "hasMore": false
 *   },
 *   "summary": {
 *     "totalSpent": 159.90,
 *     "totalPurchases": 10
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Extraer y validar JWT token
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

    // 2. Extraer query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitStr = searchParams.get('limit');
    const offsetStr = searchParams.get('offset');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // 3. Parsear a números y fechas
    const limit = limitStr ? parseInt(limitStr) : undefined;
    const offset = offsetStr ? parseInt(offsetStr) : undefined;
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // 4. Validar parámetros
    if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }
    if (offset !== undefined && (isNaN(offset) || offset < 0)) {
      return NextResponse.json(
        { error: 'Invalid offset parameter' },
        { status: 400 }
      );
    }
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startDate parameter' },
        { status: 400 }
      );
    }
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid endDate parameter' },
        { status: 400 }
      );
    }

    // 5. Ejecutar ListMyPurchasesUseCase
    const purchaseRepository = new PrismaPurchaseRepository(prisma);
    const listMyPurchasesUseCase = new ListMyPurchasesUseCase(
      purchaseRepository
    );

    const result = await listMyPurchasesUseCase.execute({
      sellerId: payload.userId,
      limit,
      offset,
      startDate,
      endDate,
    });

    // 6. Retornar resultado
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/v1/purchases error:', error);

    if (error.message?.includes('jwt') || error.message?.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
