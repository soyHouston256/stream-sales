import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaDisputeRepository } from '@/infrastructure/repositories/PrismaDisputeRepository';
import { PrismaWalletRepository } from '@/infrastructure/repositories/PrismaWalletRepository';
import { PrismaPurchaseRepository } from '@/infrastructure/repositories/PrismaPurchaseRepository';
import { ResolveDisputeUseCase } from '@/application/use-cases/ResolveDisputeUseCase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/conciliator/disputes/[id]/resolve
 *
 * Resuelve una disputa y ejecuta transacciones financieras según el tipo de resolución
 *
 * Body:
 * {
 *   resolution: string (min 20 chars),
 *   resolutionType: 'refund_seller' | 'favor_provider' | 'partial_refund' | 'no_action'
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

    // 2. Verificar rol de conciliator
    if (decoded.role !== 'conciliator') {
      return NextResponse.json(
        { error: 'Forbidden. Only conciliators can resolve disputes.' },
        { status: 403 }
      );
    }

    // 3. Parsear body
    const body = await request.json();
    const { resolution, resolutionType } = body;

    // Validaciones
    if (!resolution || !resolutionType) {
      return NextResponse.json(
        { error: 'Missing required fields: resolution, resolutionType' },
        { status: 400 }
      );
    }

    // 4. Ejecutar use case
    const disputeRepository = new PrismaDisputeRepository(prisma);
    const walletRepository = new PrismaWalletRepository(prisma);
    const purchaseRepository = new PrismaPurchaseRepository(prisma);

    const useCase = new ResolveDisputeUseCase(
      disputeRepository,
      walletRepository,
      purchaseRepository
    );

    const result = await useCase.execute({
      disputeId: params.id,
      conciliatorId: decoded.userId,
      resolution,
      resolutionType,
    });

    // 5. Retornar resultado
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[POST /api/conciliator/disputes/[id]/resolve] Error:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error.message.includes('cannot be resolved') ||
      error.message.includes('insufficient balance') ||
      error.message.includes('Only the assigned conciliator')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
