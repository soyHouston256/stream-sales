import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaDisputeRepository } from '@/infrastructure/repositories/PrismaDisputeRepository';
import { PrismaPurchaseRepository } from '@/infrastructure/repositories/PrismaPurchaseRepository';
import { CreateDisputeUseCase } from '@/application/use-cases/CreateDisputeUseCase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/provider/sales/[id]/dispute
 *
 * Crea una disputa sobre una venta completada
 *
 * Body:
 * {
 *   reason: string (min 10 chars)
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJWT(token);

    // 2. Verificar rol de provider
    if (decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Forbidden. Only providers can create disputes on sales.' },
        { status: 403 }
      );
    }

    // 3. Parsear body
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Missing required field: reason' },
        { status: 400 }
      );
    }

    // 4. Ejecutar use case
    const disputeRepository = new PrismaDisputeRepository(prisma);
    const purchaseRepository = new PrismaPurchaseRepository(prisma);

    const useCase = new CreateDisputeUseCase(
      disputeRepository,
      purchaseRepository
    );

    const result = await useCase.execute({
      purchaseId: params.id,
      userId: decoded.userId,
      userRole: 'provider',
      reason,
    });

    // 5. Retornar resultado
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/provider/sales/[id]/dispute] Error:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error.message.includes('already exists') ||
      error.message.includes('Only the seller')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
