import { DisputeMessage } from '../entities/DisputeMessage';

/**
 * IDisputeMessageRepository
 *
 * Contrato para persistencia de DisputeMessages.
 *
 * IMPORTANTE: Los mensajes son INMUTABLES (audit trail de la conversación)
 * - No hay método update()
 * - Solo se pueden crear y leer
 */
export interface IDisputeMessageRepository {
  /**
   * Guarda un nuevo mensaje
   *
   * @param message - DisputeMessage entity
   * @returns DisputeMessage guardado
   */
  save(message: DisputeMessage): Promise<DisputeMessage>;

  /**
   * Busca un mensaje por ID
   *
   * @param id - ID del mensaje
   * @returns DisputeMessage o null si no existe
   */
  findById(id: string): Promise<DisputeMessage | null>;

  /**
   * Obtiene todos los mensajes de una disputa
   *
   * @param disputeId - ID de la disputa
   * @param includeInternal - Si incluir mensajes internos (solo para conciliators)
   * @returns Array de DisputeMessages ordenados por fecha (más antiguos primero)
   */
  findByDisputeId(
    disputeId: string,
    includeInternal?: boolean
  ): Promise<DisputeMessage[]>;

  /**
   * Cuenta mensajes de una disputa
   *
   * @param disputeId - ID de la disputa
   * @param includeInternal - Si incluir mensajes internos
   * @returns Número de mensajes
   */
  countByDisputeId(
    disputeId: string,
    includeInternal?: boolean
  ): Promise<number>;

  /**
   * Obtiene mensajes enviados por un usuario específico
   *
   * @param senderId - ID del usuario
   * @returns Array de DisputeMessages
   */
  findBySender(senderId: string): Promise<DisputeMessage[]>;
}
