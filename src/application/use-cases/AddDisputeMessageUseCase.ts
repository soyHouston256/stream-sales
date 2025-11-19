import { DisputeMessage } from '../../domain/entities/DisputeMessage';
import { IDisputeMessageRepository } from '../../domain/repositories/IDisputeMessageRepository';
import { IDisputeRepository } from '../../domain/repositories/IDisputeRepository';

export interface AddDisputeMessageDTO {
  disputeId: string;
  senderId: string;
  senderRole: string; // 'seller', 'provider', 'conciliator'
  message: string;
  attachments?: string[];
  isInternal?: boolean; // Solo conciliators pueden crear mensajes internos
}

/**
 * AddDisputeMessageUseCase
 *
 * Permite agregar un mensaje a una disputa.
 *
 * Business Rules:
 * 1. Solo participantes de la disputa pueden enviar mensajes
 * 2. Solo conciliators pueden crear mensajes internos (isInternal: true)
 * 3. Mensaje debe tener mínimo 5 caracteres
 * 4. Máximo 10 attachments por mensaje
 * 5. Disputa debe estar activa (no closed)
 *
 * @example
 * const useCase = new AddDisputeMessageUseCase(messageRepo, disputeRepo);
 * const result = await useCase.execute({
 *   disputeId: 'dispute123',
 *   senderId: 'seller456',
 *   senderRole: 'seller',
 *   message: 'I have tried the credentials multiple times',
 *   attachments: ['https://cdn.example.com/screenshot.png']
 * });
 */
export class AddDisputeMessageUseCase {
  constructor(
    private messageRepository: IDisputeMessageRepository,
    private disputeRepository: IDisputeRepository
  ) {}

  async execute(data: AddDisputeMessageDTO): Promise<{
    message: ReturnType<DisputeMessage['toJSON']>;
  }> {
    // 1. Validar que la disputa existe
    const dispute = await this.disputeRepository.findById(data.disputeId);

    if (!dispute) {
      throw new Error(`Dispute not found: ${data.disputeId}`);
    }

    // 2. Validar que la disputa está activa
    if (dispute.isClosed()) {
      throw new Error(
        'Cannot add messages to a closed dispute'
      );
    }

    // 3. Validar que el sender es participante de la disputa
    if (!dispute.isParticipant(data.senderId)) {
      throw new Error(
        'Only dispute participants can send messages'
      );
    }

    // 4. Validar mensajes internos (solo conciliators)
    if (data.isInternal && data.senderRole !== 'conciliator') {
      throw new Error(
        'Only conciliators can create internal messages'
      );
    }

    // 5. Crear el mensaje
    let message: DisputeMessage;

    if (data.isInternal) {
      message = DisputeMessage.createInternal({
        disputeId: data.disputeId,
        senderId: data.senderId,
        message: data.message,
      });
    } else {
      message = DisputeMessage.create({
        disputeId: data.disputeId,
        senderId: data.senderId,
        message: data.message,
        attachments: data.attachments,
      });
    }

    // 6. Guardar el mensaje
    const savedMessage = await this.messageRepository.save(message);

    // 7. Retornar resultado
    return {
      message: savedMessage.toJSON(),
    };
  }
}
