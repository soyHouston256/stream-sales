import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaDisputeRepository } from '@/infrastructure/repositories/PrismaDisputeRepository';
import { PrismaDisputeMessageRepository } from '@/infrastructure/repositories/PrismaDisputeMessageRepository';
import { PrismaPurchaseRepository } from '@/infrastructure/repositories/PrismaPurchaseRepository';
import { GetDisputeDetailsUseCase } from '@/application/use-cases/GetDisputeDetailsUseCase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/provider/disputes/[id]
 *
 * Obtiene los detalles de una disputa del provider
 * (solo mensajes públicos, no incluye mensajes internos)
 */
export async function GET(
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
        { error: 'Forbidden. Only providers can access this endpoint.' },
        { status: 403 }
      );
    }

    // 3. Ejecutar use case
    const disputeRepository = new PrismaDisputeRepository(prisma);
    const messageRepository = new PrismaDisputeMessageRepository(prisma);
    const purchaseRepository = new PrismaPurchaseRepository(prisma);

    const useCase = new GetDisputeDetailsUseCase(
      disputeRepository,
      messageRepository,
      purchaseRepository
    );

    const result = await useCase.execute({
      disputeId: params.id,
      userId: decoded.userId,
      userRole: 'provider',
    });

    // 4. Retornar resultado
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/provider/disputes/[id]] Error:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
