import { Money } from '../../domain/value-objects/Money';
import { IWalletRepository } from '../../domain/repositories/IWalletRepository';
import { InsufficientBalanceException } from '../../domain/exceptions/InsufficientBalanceException';

/**
 * DTO para TransferMoneyUseCase
 */
export interface TransferMoneyDTO {
  fromUserId: string;
  toUserId: string;
  amount: number | string;
  currency?: string;
  description?: string;
}

/**
 * Respuesta de TransferMoneyUseCase
 */
export interface TransferMoneyResponse {
  transfer: {
    fromUserId: string;
    toUserId: string;
    amount: string;
    currency: string;
    description?: string;
  };
  senderWallet: {
    id: string;
    userId: string;
    previousBalance: string;
    newBalance: string;
  };
  receiverWallet: {
    id: string;
    userId: string;
    previousBalance: string;
    newBalance: string;
  };
}

/**
 * TransferMoneyUseCase
 *
 * Caso de uso: Transferir dinero P2P entre dos usuarios.
 *
 * Flujo:
 * 1. Buscar wallet del remitente (sender)
 * 2. Buscar wallet del destinatario (receiver)
 * 3. Validar que ambas wallets existen
 * 4. Validar que no sea auto-transferencia
 * 5. Crear Money Value Object
 * 6. Debitar de sender wallet (valida balance suficiente)
 * 7. Acreditar a receiver wallet
 * 8. Guardar ambas wallets
 * 9. Retornar detalles de la transferencia
 *
 * Cuándo se ejecuta:
 * - Transferencia P2P entre usuarios (ej: pago entre affiliates)
 * - Retiro de fondos a otra cuenta
 *
 * Reglas de negocio:
 * - Ambas wallets deben estar ACTIVE
 * - Sender debe tener balance suficiente
 * - No se permite auto-transferencia (from == to)
 * - Amount debe ser positivo
 * - Ambas wallets deben usar la misma currency
 *
 * IMPORTANTE: Este use case NO crea Transaction records.
 * Para audit trail completo, crear Transactions en un servicio superior.
 *
 * Restricción DDD: Este use case coordina 2 Aggregates (Wallet).
 * En DDD estricto, esto debería ser manejado por un Domain Service
 * o usando eventual consistency. Para simplicidad académica, lo
 * manejamos aquí con save secuencial.
 *
 * @throws InsufficientBalanceException si sender balance < amount
 *
 * @example
 * const useCase = new TransferMoneyUseCase(walletRepository);
 * const result = await useCase.execute({
 *   fromUserId: 'user123',
 *   toUserId: 'user456',
 *   amount: 50.00,
 *   description: 'Pago por servicio'
 * });
 */
export class TransferMoneyUseCase {
  constructor(private walletRepository: IWalletRepository) {}

  async execute(data: TransferMoneyDTO): Promise<TransferMoneyResponse> {
    // 1. Validar que no sea auto-transferencia
    if (data.fromUserId === data.toUserId) {
      throw new Error('Cannot transfer money to yourself');
    }

    // 2. Buscar wallet del remitente
    const senderWallet = await this.walletRepository.findByUserId(data.fromUserId);

    if (!senderWallet) {
      throw new Error(`Sender wallet not found for user ${data.fromUserId}`);
    }

    // 3. Buscar wallet del destinatario
    const receiverWallet = await this.walletRepository.findByUserId(data.toUserId);

    if (!receiverWallet) {
      throw new Error(`Receiver wallet not found for user ${data.toUserId}`);
    }

    // 4. Validar que ambas wallets usen la misma currency
    if (senderWallet.balance.currency !== receiverWallet.balance.currency) {
      throw new Error(
        `Currency mismatch. Sender uses ${senderWallet.balance.currency}, receiver uses ${receiverWallet.balance.currency}`
      );
    }

    // 5. Crear Money Value Object
    const currency = data.currency || senderWallet.balance.currency;
    const amount = Money.create(data.amount, currency);

    // 6. Validar que amount sea positivo
    if (!amount.isPositive()) {
      throw new Error('Transfer amount must be positive');
    }

    // 7. Guardar balances previos para respuesta
    const senderPreviousBalance = senderWallet.balance;
    const receiverPreviousBalance = receiverWallet.balance;

    // 8. Ejecutar débito del sender
    // wallet.debit lanza InsufficientBalanceException si balance < amount
    try {
      senderWallet.debit(amount);
    } catch (error) {
      if (error instanceof InsufficientBalanceException) {
        throw new InsufficientBalanceException(
          `Cannot transfer ${amount.toString()}. Sender ${error.message}`
        );
      }
      throw error;
    }

    // 9. Ejecutar crédito al receiver
    receiverWallet.credit(amount);

    // 10. Guardar ambas wallets
    // NOTA: En producción, esto debería ser una transacción atómica en BD
    // o usar eventual consistency con eventos de dominio
    const updatedSenderWallet = await this.walletRepository.save(senderWallet);
    const updatedReceiverWallet = await this.walletRepository.save(receiverWallet);

    // 11. Retornar respuesta con detalles completos
    return {
      transfer: {
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        amount: amount.toPlainString(),
        currency: amount.currency,
        description: data.description,
      },
      senderWallet: {
        id: updatedSenderWallet.id,
        userId: updatedSenderWallet.userId,
        previousBalance: senderPreviousBalance.toPlainString(),
        newBalance: updatedSenderWallet.balance.toPlainString(),
      },
      receiverWallet: {
        id: updatedReceiverWallet.id,
        userId: updatedReceiverWallet.userId,
        previousBalance: receiverPreviousBalance.toPlainString(),
        newBalance: updatedReceiverWallet.balance.toPlainString(),
      },
    };
  }
}
