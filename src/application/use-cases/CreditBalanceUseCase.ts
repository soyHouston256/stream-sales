import { Money } from '../../domain/value-objects/Money';
import { IWalletRepository } from '../../domain/repositories/IWalletRepository';

/**
 * DTO para CreditBalanceUseCase
 */
export interface CreditBalanceDTO {
  userId: string;
  amount: number | string; // Acepta number o string para flexibilidad
  currency?: string; // Debe coincidir con currency de la wallet
  description?: string; // Para logging/auditoría
}

/**
 * Respuesta de CreditBalanceUseCase
 */
export interface CreditBalanceResponse {
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
    amountCredited: string;
    newBalance: string;
  };
}

/**
 * CreditBalanceUseCase
 *
 * Caso de uso: Acreditar dinero a la wallet de un usuario (aumentar balance).
 *
 * Flujo:
 * 1. Buscar wallet del usuario
 * 2. Validar que wallet existe
 * 3. Crear Money Value Object con el monto
 * 4. Ejecutar wallet.credit(amount)
 * 5. Guardar wallet actualizada
 * 6. Retornar nueva balance
 *
 * Cuándo se ejecuta:
 * - Recarga de saldo (RechargeWalletUseCase)
 * - Provider recibe earnings al vender producto
 * - Usuario recibe transferencia P2P
 * - Affiliate recibe comisión
 *
 * Reglas de negocio:
 * - Wallet debe estar ACTIVE
 * - Currency debe coincidir con currency de la wallet
 * - Amount debe ser positivo
 *
 * IMPORTANTE: Este use case NO crea Transaction.
 * La creación de Transaction debe hacerse en un nivel superior
 * (ej: PurchaseProductUseCase, RechargeWalletUseCase).
 *
 * @example
 * const useCase = new CreditBalanceUseCase(walletRepository);
 * const result = await useCase.execute({
 *   userId: 'user123',
 *   amount: 100.50,
 *   description: 'Recarga de saldo'
 * });
 * console.log(result.wallet.balance); // "100.5000"
 */
export class CreditBalanceUseCase {
  constructor(private walletRepository: IWalletRepository) {}

  async execute(data: CreditBalanceDTO): Promise<CreditBalanceResponse> {
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
      throw new Error('Credit amount must be positive');
    }

    // 4. Guardar balance previo para respuesta
    const previousBalance = wallet.balance;

    // 5. Ejecutar operación de crédito (valida wallet.isActive internamente)
    wallet.credit(amount);

    // 6. Guardar wallet actualizada
    const updatedWallet = await this.walletRepository.save(wallet);

    // 7. Retornar respuesta con detalles de la transacción
    return {
      wallet: updatedWallet.toJSON(),
      transaction: {
        previousBalance: previousBalance.toPlainString(),
        amountCredited: amount.toPlainString(),
        newBalance: updatedWallet.balance.toPlainString(),
      },
    };
  }
}
