import { Money } from '../../domain/value-objects/Money';
import { IWalletRepository } from '../../domain/repositories/IWalletRepository';
import { InsufficientBalanceException } from '../../domain/exceptions/InsufficientBalanceException';

/**
 * DTO para DebitBalanceUseCase
 */
export interface DebitBalanceDTO {
  userId: string;
  amount: number | string;
  currency?: string;
  description?: string; // Para logging/auditoría
}

/**
 * Respuesta de DebitBalanceUseCase
 */
export interface DebitBalanceResponse {
  wallet: {
    id: string;
    userId: string;
    balance: string;
    currency: string;
    status: string;
    updatedAt: Date;
  };
  transaction: {
    previousBalance: string;
    amountDebited: string;
    newBalance: string;
  };
}

/**
 * DebitBalanceUseCase
 *
 * Caso de uso: Debitar dinero de la wallet de un usuario (disminuir balance).
 *
 * Flujo:
 * 1. Buscar wallet del usuario
 * 2. Validar que wallet existe
 * 3. Crear Money Value Object con el monto
 * 4. Ejecutar wallet.debit(amount) - valida balance suficiente
 * 5. Guardar wallet actualizada
 * 6. Retornar nueva balance
 *
 * Cuándo se ejecuta:
 * - Compra de producto (PurchaseProductUseCase)
 * - Transferencia P2P (TransferMoneyUseCase)
 * - Retiro de fondos (WithdrawFundsUseCase)
 *
 * Reglas de negocio:
 * - Wallet debe estar ACTIVE
 * - Balance debe ser >= amount (validado en Wallet.debit)
 * - Currency debe coincidir
 * - Amount debe ser positivo
 *
 * IMPORTANTE: Este use case NO crea Transaction.
 * La creación de Transaction debe hacerse en un nivel superior.
 *
 * @throws InsufficientBalanceException si balance < amount
 *
 * @example
 * const useCase = new DebitBalanceUseCase(walletRepository);
 * const result = await useCase.execute({
 *   userId: 'user123',
 *   amount: 50.00,
 *   description: 'Compra de producto'
 * });
 * console.log(result.wallet.balance); // "50.5000" (si balance previo era 100.50)
 */
export class DebitBalanceUseCase {
  constructor(private walletRepository: IWalletRepository) {}

  async execute(data: DebitBalanceDTO): Promise<DebitBalanceResponse> {
    // 1. Buscar wallet del usuario
    const wallet = await this.walletRepository.findByUserId(data.userId);

    if (!wallet) {
      throw new Error(`Wallet not found for user ${data.userId}`);
    }

    // 2. Crear Money Value Object
    const currency = data.currency || wallet.balance.currency;
    const amount = Money.create(data.amount, currency);

    // 3. Validar que amount sea positivo
    if (!amount.isPositive()) {
      throw new Error('Debit amount must be positive');
    }

    // 4. Guardar balance previo para respuesta
    const previousBalance = wallet.balance;

    // 5. Ejecutar operación de débito
    // wallet.debit lanza InsufficientBalanceException si balance < amount
    try {
      wallet.debit(amount);
    } catch (error) {
      // Re-lanzar InsufficientBalanceException con contexto adicional
      if (error instanceof InsufficientBalanceException) {
        throw new InsufficientBalanceException(
          `Cannot debit ${amount.toString()} from wallet. ${error.message}`
        );
      }
      throw error;
    }

    // 6. Guardar wallet actualizada
    const updatedWallet = await this.walletRepository.save(wallet);

    // 7. Retornar respuesta con detalles de la transacción
    return {
      wallet: updatedWallet.toJSON(),
      transaction: {
        previousBalance: previousBalance.toPlainString(),
        amountDebited: amount.toPlainString(),
        newBalance: updatedWallet.balance.toPlainString(),
      },
    };
  }
}
