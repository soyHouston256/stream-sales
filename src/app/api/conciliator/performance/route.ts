import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { prisma } from '@/infrastructure/database/prisma';

/**
 * GET /api/conciliator/performance
 *
 * Obtiene métricas de rendimiento del conciliator:
 * - Total de disputas resueltas
 * - Tiempo promedio de resolución
 * - Tasa de reembolsos
 * - Disputas resueltas esta semana
 * - Resoluciones por tipo
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

    // 3. Obtener total de disputas resueltas
    const totalResolved = await prisma.dispute.count({
      where: {
        conciliatorId,
        status: {
          in: ['resolved', 'closed'],
        },
      },
    });

    // 4. Calcular tiempo promedio de resolución
    const resolvedDisputes = await prisma.dispute.findMany({
      where: {
        conciliatorId,
        status: {
          in: ['resolved', 'closed'],
        },
        resolvedAt: {
          not: null,
        },
        assignedAt: {
          not: null,
        },
      },
      select: {
        assignedAt: true,
        resolvedAt: true,
      },
    });

    let averageResolutionTimeHours = 0;
    if (resolvedDisputes.length > 0) {
      const totalHours = resolvedDisputes.reduce((sum, dispute) => {
        if (dispute.assignedAt && dispute.resolvedAt) {
          const hours =
            (new Date(dispute.resolvedAt).getTime() - new Date(dispute.assignedAt).getTime()) /
            (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);
      averageResolutionTimeHours = totalHours / resolvedDisputes.length;
    }

    // 5. Calcular tasa de reembolsos
    const refundCount = await prisma.dispute.count({
      where: {
        conciliatorId,
        status: {
          in: ['resolved', 'closed'],
        },
        resolutionType: {
          in: ['refund_seller', 'partial_refund'],
        },
      },
    });

    const refundRate = totalResolved > 0 ? (refundCount / totalResolved) * 100 : 0;

    // 6. Obtener disputas resueltas esta semana
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekResolved = await prisma.dispute.count({
      where: {
        conciliatorId,
        status: {
          in: ['resolved', 'closed'],
        },
        resolvedAt: {
          gte: startOfWeek,
        },
      },
    });

    // 7. Obtener resoluciones por tipo
    const resolutionsByTypeData = await prisma.dispute.groupBy({
      by: ['resolutionType'],
      where: {
        conciliatorId,
        status: {
          in: ['resolved', 'closed'],
        },
        resolutionType: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
    });

    const resolutionsByType = {
      refund_seller: 0,
      favor_provider: 0,
      partial_refund: 0,
      no_action: 0,
    };

    resolutionsByTypeData.forEach((item) => {
      if (item.resolutionType) {
        resolutionsByType[item.resolutionType as keyof typeof resolutionsByType] = item._count.id;
      }
    });

    // 8. Retornar resultado
    return NextResponse.json(
      {
        totalResolved,
        averageResolutionTimeHours: parseFloat(averageResolutionTimeHours.toFixed(2)),
        refundRate: parseFloat(refundRate.toFixed(2)),
        thisWeekResolved,
        resolutionsByType,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/conciliator/performance] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
