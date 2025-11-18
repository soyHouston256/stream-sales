import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaDisputeRepository } from '@/infrastructure/repositories/PrismaDisputeRepository';
import { AssignDisputeUseCase } from '@/application/use-cases/AssignDisputeUseCase';

/**
 * POST /api/conciliator/disputes/[id]/assign
 *
 * Permite al conciliator auto-asignarse una disputa abierta
 *
 * Body: No requiere (el conciliatorId viene del token JWT)
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
        { error: 'Forbidden. Only conciliators can assign disputes.' },
        { status: 403 }
      );
    }

    // 3. Ejecutar use case
    const disputeRepository = new PrismaDisputeRepository(prisma);
    const useCase = new AssignDisputeUseCase(disputeRepository);

    const result = await useCase.execute({
      disputeId: params.id,
      conciliatorId: decoded.userId,
    });

    // 4. Retornar resultado
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[POST /api/conciliator/disputes/[id]/assign] Error:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message.includes('cannot be assigned')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
