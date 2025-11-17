import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import prisma from '@/infrastructure/database/prisma';
import { PrismaDisputeRepository } from '@/infrastructure/repositories/PrismaDisputeRepository';
import { ListDisputesUseCase } from '@/application/use-cases/ListDisputesUseCase';

/**
 * GET /api/conciliator/disputes
 *
 * Lista todas las disputas visibles para el conciliator
 * - Disputas abiertas (para asignar)
 * - Disputas asignadas al conciliator
 *
 * Query params:
 * - status: open | under_review | resolved | closed
 * - startDate: ISO date
 * - endDate: ISO date
 * - limit: number (default 20)
 * - offset: number (default 0)
 */
export async function GET(request: Request) {
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
        { error: 'Forbidden. Only conciliators can access this endpoint.' },
        { status: 403 }
      );
    }

    // 3. Obtener query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 4. Ejecutar use case
    const disputeRepository = new PrismaDisputeRepository(prisma);
    const listDisputesUseCase = new ListDisputesUseCase(disputeRepository);

    const result = await listDisputesUseCase.execute({
      userId: decoded.userId,
      userRole: 'conciliator',
      filters: {
        status,
        startDate,
        endDate,
        limit,
        offset,
      },
    });

    // 5. Retornar resultado
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/conciliator/disputes] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
