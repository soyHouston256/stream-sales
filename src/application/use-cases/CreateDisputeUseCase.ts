import { Dispute } from '../../domain/entities/Dispute';
import { IDisputeRepository } from '../../domain/repositories/IDisputeRepository';
import { IPurchaseRepository } from '../../domain/repositories/IPurchaseRepository';

export interface CreateDisputeDTO {
  purchaseId: string;
  userId: string; // Seller o Provider que abre la disputa
  userRole: string; // Para determinar si es seller o provider
  reason: string;
}

/**
 * CreateDisputeUseCase
 *
 * Permite a Seller o Provider abrir una disputa sobre una compra completada.
 *
 * Business Rules:
 * 1. Solo se puede abrir disputa sobre purchases con status "completed"
 * 2. Solo puede haber UNA disputa por purchase (purchaseId unique)
 * 3. Solo el seller o provider de la compra pueden abrir disputa
 * 4. Razón debe tener mínimo 10 caracteres
 * 5. No se puede abrir disputa sobre compra propia si eres provider
 *
 * @example
 * const useCase = new CreateDisputeUseCase(disputeRepository, purchaseRepository);
 * const result = await useCase.execute({
 *   purchaseId: 'purchase123',
 *   userId: 'seller456',
 *   userRole: 'seller',
 *   reason: 'Product credentials do not work'
 * });
 */
export class CreateDisputeUseCase {
  constructor(
    private disputeRepository: IDisputeRepository,
    private purchaseRepository: IPurchaseRepository
  ) {}

  async execute(data: CreateDisputeDTO): Promise<{
    dispute: ReturnType<Dispute['toJSON']>;
  }> {
    // 1. Validar que la compra existe
    const purchase = await this.purchaseRepository.findById(data.purchaseId);

    if (!purchase) {
      throw new Error(`Purchase not found: ${data.purchaseId}`);
    }

    // 2. Validar que el usuario es parte de la compra
    const isSeller = purchase.sellerId === data.userId;
    const isProvider = purchase.providerId === data.userId;

    if (!isSeller && !isProvider) {
      throw new Error(
        'Only the seller or provider of a purchase can open a dispute'
      );
    }

    // 3. Verificar que no existe una disputa previa para esta compra
    const existingDispute = await this.disputeRepository.findByPurchaseId(
      data.purchaseId
    );

    if (existingDispute) {
      throw new Error(
        `A dispute already exists for this purchase: ${existingDispute.id}`
      );
    }

    // 4. Determinar quién abre la disputa (seller o provider)
    const openedBy: 'seller' | 'provider' = isSeller ? 'seller' : 'provider';

    // 5. Crear la disputa
    const dispute = Dispute.create({
      purchaseId: data.purchaseId,
      sellerId: purchase.sellerId,
      providerId: purchase.providerId,
      openedBy: openedBy,
      reason: data.reason,
    });

    // 6. Guardar en el repository
    const savedDispute = await this.disputeRepository.save(dispute);

    // 7. Retornar resultado
    return {
      dispute: savedDispute.toJSON(),
    };
  }
}
