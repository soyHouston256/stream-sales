import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { prisma } from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';

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
    const queryStatus = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 4. Build where clause
    const where: any = {};

    // Lógica para conciliator:
    // - Si status=open: ver disputas abiertas para asignar
    // - De lo contrario: ver disputas asignadas a él
    if (queryStatus === 'open') {
      where.status = 'open';
    } else {
      where.conciliatorId = decoded.userId;
      if (queryStatus) {
        where.status = queryStatus;
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // 5. Fetch disputes with relations
    const disputes = await prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        seller: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        conciliator: { select: { id: true, name: true, email: true } },
      },
    });

    // 6. Count total
    const total = await prisma.dispute.count({ where });

    // 7. Format response
    const formattedDisputes = disputes.map((d: any) => {
      const firstItem = d.order?.items[0];
      const product = firstItem?.variant.product;

      return {
        id: d.id,
        purchaseId: d.orderId, // Keeping key for compatibility
        sellerId: d.sellerId,
        providerId: d.providerId,
        conciliatorId: d.conciliatorId,
        openedBy: d.openedBy,
        reason: d.reason,
        status: d.status,
        resolution: d.resolution,
        resolutionType: d.resolutionType,
        createdAt: d.createdAt.toISOString(),
        assignedAt: d.assignedAt?.toISOString() || null,
        resolvedAt: d.resolvedAt?.toISOString() || null,
        purchase: d.order ? {
          id: d.order.id,
          amount: d.order.totalAmount.toString(),
          product: product ? {
            id: product.id,
            name: product.name,
            category: product.category,
          } : undefined,
        } : undefined,
        seller: d.seller,
        provider: d.provider,
        conciliator: d.conciliator,
      };
    });

    // 8. Return result
    return NextResponse.json({
      disputes: formattedDisputes,
      total,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/conciliator/disputes] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
