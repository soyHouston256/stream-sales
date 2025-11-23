import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaDisputeRepository } from '@/infrastructure/repositories/PrismaDisputeRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conciliator/stats
 *
 * Obtiene estadísticas del conciliator actual:
 * - Total de disputas asignadas
 * - Disputas por status (open, under_review, resolved, closed)
 * - Tiempo promedio de resolución
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

    // 3. Obtener estadísticas del conciliator
    const disputeRepository = new PrismaDisputeRepository(prisma);
    const stats = await disputeRepository.getStats(decoded.userId);

    // 4. Obtener disputas pendientes (open que puede asignar)
    const openDisputes = await disputeRepository.findAll({
      status: 'open',
      limit: 100,
    });

    // 5. Retornar resultado
    return NextResponse.json(
      {
        ...stats,
        availableToAssign: openDisputes.length,
        myDisputes: {
          total: stats.total,
          underReview: stats.underReview,
          resolved: stats.resolved,
          closed: stats.closed,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/conciliator/stats] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
