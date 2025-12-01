import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { prisma } from '@/infrastructure/database/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conciliator/disputes/[id]
 *
 * Obtiene los detalles completos de una disputa incluyendo:
 * - Información de la disputa
 * - Información de la compra con producto
 * - Mensajes (públicos + internos para conciliator)
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

    // 2. Verificar rol de conciliator
    if (decoded.role !== 'conciliator') {
      return NextResponse.json(
        { error: 'Forbidden. Only conciliators can access this endpoint.' },
        { status: 403 }
      );
    }

    // 3. Buscar disputa con todas las relaciones
    const dispute = await prisma.dispute.findUnique({
      where: { id: params.id },
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
                        description: true,
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

    if (!dispute) {
      return NextResponse.json(
        { error: `Dispute not found: ${params.id}` },
        { status: 404 }
      );
    }

    // 4. Validar acceso (solo participantes)
    const isParticipant =
      dispute.sellerId === decoded.userId ||
      dispute.providerId === decoded.userId ||
      dispute.conciliatorId === decoded.userId;

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Access denied. Only dispute participants can view details.' },
        { status: 403 }
      );
    }

    // 5. Obtener mensajes (incluir internos para conciliator)
    const messages = await prisma.disputeMessage.findMany({
      where: {
        disputeId: params.id,
        // Conciliator ve mensajes internos
        ...(decoded.role !== 'conciliator' ? { isInternal: false } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const messageCount = messages.length;

    // Helper to extract product info from order items
    const firstItem = dispute.order.items[0];
    const product = firstItem?.variant.product;
    const variant = firstItem?.variant;

    // 6. Formatear respuesta
    const formattedDispute = {
      id: dispute.id,
      purchaseId: dispute.orderId, // Keeping key for frontend compatibility
      sellerId: dispute.sellerId,
      providerId: dispute.providerId,
      conciliatorId: dispute.conciliatorId,
      openedBy: dispute.openedBy,
      reason: dispute.reason,
      status: dispute.status,
      resolution: dispute.resolution,
      resolutionType: dispute.resolutionType,
      createdAt: dispute.createdAt.toISOString(),
      assignedAt: dispute.assignedAt?.toISOString() || null,
      resolvedAt: dispute.resolvedAt?.toISOString() || null,
      purchase: {
        id: dispute.order.id,
        amount: dispute.order.totalAmount.toString(),
        status: dispute.order.status,
        createdAt: dispute.order.createdAt.toISOString(),
        product: product ? {
          id: product.id,
          name: product.name,
          category: product.category,
          description: product.description,
          price: variant?.price.toString() || '0.00',
        } : undefined,
      },
      seller: dispute.seller,
      provider: dispute.provider,
      conciliator: dispute.conciliator,
    };

    const formattedMessages = messages.map((m: any) => ({
      id: m.id,
      disputeId: m.disputeId,
      senderId: m.senderId,
      message: m.message,
      isInternal: m.isInternal,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender,
    }));

    // 7. Retornar resultado
    return NextResponse.json({
      dispute: formattedDispute,
      purchase: formattedDispute.purchase,
      messages: formattedMessages,
      messageCount,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/conciliator/disputes/[id]] Error:', error);

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
