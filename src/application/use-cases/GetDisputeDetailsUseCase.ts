import { Dispute } from '../../domain/entities/Dispute';
import { DisputeMessage } from '../../domain/entities/DisputeMessage';
import { IDisputeRepository } from '../../domain/repositories/IDisputeRepository';
import { IDisputeMessageRepository } from '../../domain/repositories/IDisputeMessageRepository';
import { IPurchaseRepository } from '../../domain/repositories/IPurchaseRepository';

export interface GetDisputeDetailsDTO {
  disputeId: string;
  userId: string;
  userRole: string; // 'admin', 'conciliator', 'seller', 'provider'
}

/**
 * GetDisputeDetailsUseCase
 *
 * Obtiene los detalles completos de una disputa incluyendo:
 * - Información de la disputa
 * - Información de la compra relacionada
 * - Mensajes de la conversación (públicos + internos si es conciliator)
 *
 * Business Rules:
 * 1. Solo participantes de la disputa pueden ver los detalles
 * 2. Seller y Provider solo ven mensajes públicos
 * 3. Conciliator ve todos los mensajes (públicos + internos)
 * 4. Admin ve todos los mensajes
 *
 * @example
 * const useCase = new GetDisputeDetailsUseCase(disputeRepo, messageRepo, purchaseRepo);
 * const result = await useCase.execute({
 *   disputeId: 'dispute123',
 *   userId: 'conciliator456',
 *   userRole: 'conciliator'
 * });
 */
export class GetDisputeDetailsUseCase {
  constructor(
    private disputeRepository: IDisputeRepository,
    private messageRepository: IDisputeMessageRepository,
    private purchaseRepository: IPurchaseRepository
  ) {}

  async execute(data: GetDisputeDetailsDTO): Promise<{
    dispute: ReturnType<Dispute['toDetailedJSON']>;
    purchase: any; // Purchase details
    messages: ReturnType<DisputeMessage['toJSON']>[];
    messageCount: number;
  }> {
    // 1. Buscar la disputa
    const dispute = await this.disputeRepository.findById(data.disputeId);

    if (!dispute) {
      throw new Error(`Dispute not found: ${data.disputeId}`);
    }

    // 2. Validar acceso (solo participantes + admin)
    const hasAccess =
      data.userRole === 'admin' || dispute.isParticipant(data.userId);

    if (!hasAccess) {
      throw new Error(
        'Access denied. Only dispute participants can view details.'
      );
    }

    // 3. Obtener la compra relacionada
    const purchase = await this.purchaseRepository.findById(
      dispute.purchaseId
    );

    if (!purchase) {
      throw new Error(`Purchase not found: ${dispute.purchaseId}`);
    }

    // 4. Obtener mensajes
    // Conciliators y admins ven mensajes internos
    const includeInternal =
      data.userRole === 'conciliator' || data.userRole === 'admin';

    const messages = await this.messageRepository.findByDisputeId(
      data.disputeId,
      includeInternal
    );

    const messageCount = await this.messageRepository.countByDisputeId(
      data.disputeId,
      includeInternal
    );

    // 5. Retornar resultado
    return {
      dispute: dispute.toDetailedJSON(),
      purchase: purchase.toJSON(),
      messages: messages.map((m: DisputeMessage) => m.toJSON()),
      messageCount,
    };
  }
}
