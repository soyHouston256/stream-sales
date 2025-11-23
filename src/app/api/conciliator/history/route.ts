import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { prisma } from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conciliator/history
 *
 * Obtiene el historial de disputas resueltas por el conciliator
 * Query params:
 * - page: número de página (default: 1)
 * - limit: elementos por página (default: 10)
 * - dateFrom: fecha desde (ISO string)
 * - dateTo: fecha hasta (ISO string)
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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // 4. Construir filtros
    const where: any = {
      conciliatorId,
      status: {
        in: ['resolved', 'closed'],
      },
    };

    if (dateFrom || dateTo) {
      where.resolvedAt = {};
      if (dateFrom) {
        where.resolvedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.resolvedAt.lte = new Date(dateTo);
      }
    }

    // 5. Obtener total de disputas
    const total = await prisma.dispute.count({ where });

    // 6. Obtener disputas paginadas
    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        purchase: {
          include: {
            product: {
              select: {
                id: true,
                category: true,
                name: true,
                description: true,
              },
            },
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        conciliator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        resolvedAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 7. Formatear respuesta
    const formattedDisputes = disputes.map((dispute) => ({
      id: dispute.id,
      purchaseId: dispute.purchaseId,
      sellerId: dispute.sellerId,
      providerId: dispute.providerId,
      conciliatorId: dispute.conciliatorId,
      openedBy: dispute.openedBy,
      reason: dispute.reason,
      status: dispute.status,
      resolution: dispute.resolution,
      resolutionType: dispute.resolutionType,
      partialRefundPercentage: dispute.partialRefundPercentage
        ? parseFloat(dispute.partialRefundPercentage.toString())
        : null,
      createdAt: dispute.createdAt.toISOString(),
      assignedAt: dispute.assignedAt?.toISOString() || null,
      resolvedAt: dispute.resolvedAt?.toISOString() || null,
      purchase: {
        id: dispute.purchase.id,
        amount: dispute.purchase.amount.toString(),
        product: {
          id: dispute.purchase.product.id,
          category: dispute.purchase.product.category,
          name: dispute.purchase.product.name,
          description: dispute.purchase.product.description,
        },
      },
      seller: dispute.seller,
      provider: dispute.provider,
      conciliator: dispute.conciliator || undefined,
    }));

    // 8. Calcular paginación
    const totalPages = Math.ceil(total / limit);

    // 9. Retornar resultado
    return NextResponse.json(
      {
        disputes: formattedDisputes,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/conciliator/history] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
