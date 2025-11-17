import { Dispute } from '../../domain/entities/Dispute';
import { IDisputeRepository } from '../../domain/repositories/IDisputeRepository';

export interface AssignDisputeDTO {
  disputeId: string;
  conciliatorId: string;
}

/**
 * AssignDisputeUseCase
 *
 * Permite a un conciliator auto-asignarse una disputa abierta.
 *
 * Business Rules:
 * 1. Solo disputas con status "open" pueden ser asignadas
 * 2. Conciliator se auto-asigna (no puede asignar a otro conciliator)
 * 3. Cambia status a "under_review"
 * 4. Establece assignedAt timestamp
 *
 * @example
 * const useCase = new AssignDisputeUseCase(disputeRepository);
 * const result = await useCase.execute({
 *   disputeId: 'dispute123',
 *   conciliatorId: 'conciliator456'
 * });
 */
export class AssignDisputeUseCase {
  constructor(private disputeRepository: IDisputeRepository) {}

  async execute(data: AssignDisputeDTO): Promise<{
    dispute: ReturnType<Dispute['toJSON']>;
  }> {
    // 1. Buscar la disputa
    const dispute = await this.disputeRepository.findById(data.disputeId);

    if (!dispute) {
      throw new Error(`Dispute not found: ${data.disputeId}`);
    }

    // 2. Validar que está abierta para asignación
    if (!dispute.isOpenForAssignment()) {
      throw new Error(
        `Dispute cannot be assigned. Current status: ${dispute.status.value}. ` +
          `${
            dispute.conciliatorId
              ? `Already assigned to: ${dispute.conciliatorId}`
              : ''
          }`
      );
    }

    // 3. Asignar al conciliator
    dispute.assignToConciliator(data.conciliatorId);

    // 4. Guardar cambios
    const savedDispute = await this.disputeRepository.save(dispute);

    // 5. Retornar resultado
    return {
      dispute: savedDispute.toJSON(),
    };
  }
}
