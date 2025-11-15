import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../infrastructure/database/prisma';
import { PrismaPurchaseRepository } from '../../../../../infrastructure/repositories/PrismaPurchaseRepository';
import { GetPurchaseByIdUseCase } from '../../../../../application/use-cases/GetPurchaseByIdUseCase';
import { verifyJWT } from '../../../../../infrastructure/auth/jwt';

/**
 * GET /api/v1/purchases/:id
 *
 * Obtener detalles de una compra específica.
 *
 * Autorización:
 * - Solo el seller (comprador) puede ver sus propias compras
 * - Admin puede ver todas las compras
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
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
 *     "createdAt": "2025-11-15T10:30:00Z",
 *     "breakdown": {
 *       "totalPaid": "15.9900",
 *       "adminCommission": "0.7995",
 *       "providerReceived": "15.1905",
 *       "commissionRate": 0.05
 *     }
 *   }
 * }
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: No es el dueño de la compra
 * - 404 Not Found: Compra no existe
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 2. Extraer purchase ID
    const purchaseId = params.id;

    if (!purchaseId) {
      return NextResponse.json(
        { error: 'Purchase ID is required' },
        { status: 400 }
      );
    }

    // 3. Ejecutar GetPurchaseByIdUseCase
    const purchaseRepository = new PrismaPurchaseRepository(prisma);
    const getPurchaseByIdUseCase = new GetPurchaseByIdUseCase(
      purchaseRepository
    );

    const result = await getPurchaseByIdUseCase.execute({
      purchaseId,
      requestUserId: payload.userId,
    });

    // 4. Retornar resultado
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error(`GET /api/v1/purchases/${params.id} error:`, error);

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

    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
