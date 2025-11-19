import { Dispute } from '../../domain/entities/Dispute';
import { ResolutionType } from '../../domain/value-objects/ResolutionType';
import { IDisputeRepository } from '../../domain/repositories/IDisputeRepository';
import { IWalletRepository } from '../../domain/repositories/IWalletRepository';
import { IPurchaseRepository } from '../../domain/repositories/IPurchaseRepository';
import { Money } from '../../domain/value-objects/Money';

export interface ResolveDisputeDTO {
  disputeId: string;
  conciliatorId: string;
  resolution: string; // Explicación detallada de la decisión
  resolutionType: string; // 'refund_seller' | 'favor_provider' | 'partial_refund' | 'no_action'
}

/**
 * ResolveDisputeUseCase
 *
 * Permite al conciliator asignado resolver una disputa y ejecutar
 * las transacciones financieras correspondientes según el tipo de resolución.
 *
 * Business Rules:
 * 1. Solo disputas "under_review" pueden resolverse
 * 2. Solo el conciliator asignado puede resolver
 * 3. Resolución debe explicar la decisión (mínimo 20 caracteres)
 * 4. Transacciones financieras se ejecutan según resolutionType:
 *    - refund_seller: 100% reembolso (provider → seller)
 *    - partial_refund: 50% reembolso (provider → seller)
 *    - favor_provider: Sin transacciones
 *    - no_action: Sin transacciones
 * 5. Provider debe tener saldo suficiente para reembolsos
 * 6. Después de ejecutar transacciones, disputa cambia a "resolved"
 * 7. Se debe llamar a close() en un paso posterior para marcar como "closed"
 *
 * @example
 * const useCase = new ResolveDisputeUseCase(disputeRepo, walletRepo, purchaseRepo);
 * const result = await useCase.execute({
 *   disputeId: 'dispute123',
 *   conciliatorId: 'conciliator456',
 *   resolution: 'After reviewing evidence, credentials were invalid',
 *   resolutionType: 'refund_seller'
 * });
 */
export class ResolveDisputeUseCase {
  constructor(
    private disputeRepository: IDisputeRepository,
    private walletRepository: IWalletRepository,
    private purchaseRepository: IPurchaseRepository
  ) {}

  async execute(data: ResolveDisputeDTO): Promise<{
    dispute: ReturnType<Dispute['toJSON']>;
    transactionsExecuted: boolean;
    refundAmount?: string;
  }> {
    // 1. Buscar la disputa
    const dispute = await this.disputeRepository.findById(data.disputeId);

    if (!dispute) {
      throw new Error(`Dispute not found: ${data.disputeId}`);
    }

    // 2. Validar que puede ser resuelta
    if (!dispute.status.canBeResolved()) {
      throw new Error(
        `Dispute cannot be resolved. Current status: ${dispute.status.value}. Must be "under_review".`
      );
    }

    // 3. Validar que el conciliator asignado es quien resuelve
    if (!dispute.isAssignedToConciliator(data.conciliatorId)) {
      throw new Error(
        `Only the assigned conciliator can resolve this dispute. Assigned to: ${dispute.conciliatorId}`
      );
    }

    // 4. Crear ResolutionType value object
    const resolutionType = ResolutionType.create(data.resolutionType);

    // 5. Ejecutar transacciones financieras si es necesario
    let transactionsExecuted = false;
    let refundAmount: Money | undefined;

    if (resolutionType.requiresFinancialTransactions()) {
      // Obtener la compra para saber el monto
      const purchase = await this.purchaseRepository.findById(
        dispute.purchaseId
      );

      if (!purchase) {
        throw new Error(`Purchase not found: ${dispute.purchaseId}`);
      }

      // Calcular monto del reembolso
      const refundPercentage = resolutionType.getRefundPercentage();
      refundAmount = purchase.amount.multiply(refundPercentage / 100);

      // Obtener wallets
      const sellerWallet = await this.walletRepository.findByUserId(
        dispute.sellerId
      );
      const providerWallet = await this.walletRepository.findByUserId(
        dispute.providerId
      );

      if (!sellerWallet) {
        throw new Error(`Seller wallet not found: ${dispute.sellerId}`);
      }

      if (!providerWallet) {
        throw new Error(`Provider wallet not found: ${dispute.providerId}`);
      }

      // Validar que provider tiene saldo suficiente
      if (providerWallet.balance.isLessThan(refundAmount)) {
        throw new Error(
          `Provider has insufficient balance for refund. Required: ${refundAmount.toPlainString()}, Available: ${providerWallet.balance.toPlainString()}`
        );
      }

      // Ejecutar transferencia: Provider → Seller
      providerWallet.debit(refundAmount);
      sellerWallet.credit(refundAmount);

      // Guardar wallets actualizadas
      await this.walletRepository.save(providerWallet);
      await this.walletRepository.save(sellerWallet);

      transactionsExecuted = true;

      console.log(
        `[ResolveDisputeUseCase] Refund executed: ${refundAmount.toPlainString()} from provider ${dispute.providerId} to seller ${dispute.sellerId}`
      );

      // Marcar purchase como refunded cuando hay refund completo o parcial
      await this.purchaseRepository.markAsRefunded(dispute.purchaseId);
    }

    // 6. Resolver la disputa
    dispute.resolve(data.resolution, resolutionType);

    // 7. Guardar disputa actualizada
    const savedDispute = await this.disputeRepository.save(dispute);

    // 8. Cerrar la disputa inmediatamente (estado final)
    savedDispute.close();
    const closedDispute = await this.disputeRepository.save(savedDispute);

    // 9. Retornar resultado
    return {
      dispute: closedDispute.toJSON(),
      transactionsExecuted,
      refundAmount: refundAmount?.toPlainString(),
    };
  }
}
