import { PrismaClient, Prisma } from '@prisma/client';
import { DisputeMessage } from '../../domain/entities/DisputeMessage';
import { IDisputeMessageRepository } from '../../domain/repositories/IDisputeMessageRepository';

/**
 * Type for DisputeMessage with sender from Prisma queries
 */
type DisputeMessageWithSender = Prisma.DisputeMessageGetPayload<{
  include: {
    sender: { select: { id: true; name: true; email: true } };
  };
}>;

/**
 * PrismaDisputeMessageRepository
 *
 * Implementación concreta de IDisputeMessageRepository usando Prisma ORM.
 *
 * IMPORTANTE: Los mensajes son INMUTABLES (audit trail)
 * - Solo se implementa save() para creación
 * - No hay método update()
 */
export class PrismaDisputeMessageRepository
  implements IDisputeMessageRepository {
  constructor(private readonly prisma: PrismaClient) { }

  /**
   * Guarda un nuevo mensaje
   */
  async save(message: DisputeMessage): Promise<DisputeMessage> {
    const data = message.toPersistence();

    const saved = await this.prisma.disputeMessage.create({
      data: {
        id: data.id,
        disputeId: data.disputeId,
        senderId: data.senderId,
        message: data.message,
        attachments: data.attachments, // JSON field
        isInternal: data.isInternal,
        createdAt: data.createdAt,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    });

    return this.toDomain(saved);
  }

  /**
   * Busca mensaje por ID
   */
  async findById(id: string): Promise<DisputeMessage | null> {
    const message = await this.prisma.disputeMessage.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    });

    return message ? this.toDomain(message) : null;
  }

  /**
   * Obtiene todos los mensajes de una disputa
   *
   * @param disputeId - ID de la disputa
   * @param includeInternal - Si incluir mensajes internos (solo conciliators)
   * @returns Array ordenado por fecha (más antiguos primero)
   */
  async findByDisputeId(
    disputeId: string,
    includeInternal: boolean = false
  ): Promise<DisputeMessage[]> {
    const where: Prisma.DisputeMessageWhereInput = { disputeId };

    // Si no incluir internos, filtrar solo públicos
    if (!includeInternal) {
      where.isInternal = false;
    }

    const messages = await this.prisma.disputeMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' }, // Más antiguos primero (conversación cronológica)
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    });

    return messages.map((m) => this.toDomain(m));
  }

  /**
   * Cuenta mensajes de una disputa
   */
  async countByDisputeId(
    disputeId: string,
    includeInternal: boolean = false
  ): Promise<number> {
    const where: Prisma.DisputeMessageWhereInput = { disputeId };

    if (!includeInternal) {
      where.isInternal = false;
    }

    return this.prisma.disputeMessage.count({ where });
  }

  /**
   * Obtiene mensajes enviados por un usuario
   */
  async findBySender(senderId: string): Promise<DisputeMessage[]> {
    const messages = await this.prisma.disputeMessage.findMany({
      where: { senderId },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    });

    return messages.map((m) => this.toDomain(m));
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Convierte de Prisma model a Domain entity
   */
  private toDomain(prismaMessage: DisputeMessageWithSender): DisputeMessage {
    return DisputeMessage.fromPersistence({
      id: prismaMessage.id,
      disputeId: prismaMessage.disputeId,
      senderId: prismaMessage.senderId,
      message: prismaMessage.message,
      attachments: Array.isArray(prismaMessage.attachments)
        ? (prismaMessage.attachments as string[])
        : null,
      isInternal: prismaMessage.isInternal,
      createdAt: prismaMessage.createdAt,
    });
  }
}
