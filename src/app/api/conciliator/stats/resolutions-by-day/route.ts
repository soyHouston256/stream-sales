import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { prisma } from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conciliator/stats/resolutions-by-day
 *
 * Obtiene estadísticas de resoluciones agrupadas por día
 * Query params:
 * - days: número de días hacia atrás (default: 30)
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

    const conciliatorId = decoded.userId;

    // 3. Parsear query params
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // 4. Calcular fecha desde
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 5. Obtener disputas resueltas en el período
    const resolvedDisputes = await prisma.dispute.findMany({
      where: {
        conciliatorId,
        status: {
          in: ['resolved', 'closed'],
        },
        resolvedAt: {
          gte: startDate,
        },
      },
      select: {
        resolvedAt: true,
      },
      orderBy: {
        resolvedAt: 'asc',
      },
    });

    // 6. Agrupar por día
    const resolutionsByDay: { [key: string]: number } = {};

    // Inicializar todos los días con 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      resolutionsByDay[dateStr] = 0;
    }

    // Contar resoluciones por día
    resolvedDisputes.forEach((dispute) => {
      if (dispute.resolvedAt) {
        const dateStr = dispute.resolvedAt.toISOString().split('T')[0];
        if (resolutionsByDay[dateStr] !== undefined) {
          resolutionsByDay[dateStr]++;
        }
      }
    });

    // 7. Convertir a array y ordenar por fecha
    const result = Object.entries(resolutionsByDay)
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 8. Retornar resultado (el hook espera el array directamente)
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/conciliator/stats/resolutions-by-day] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
