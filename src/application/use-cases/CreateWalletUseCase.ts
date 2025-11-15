import { Wallet } from '../../domain/entities/Wallet';
import { IWalletRepository } from '../../domain/repositories/IWalletRepository';

/**
 * DTO para CreateWalletUseCase
 */
export interface CreateWalletDTO {
  userId: string;
  currency?: string; // Default: USD
}

/**
 * Respuesta de CreateWalletUseCase
 */
export interface CreateWalletResponse {
  wallet: {
    id: string;
    userId: string;
    balance: string;
    currency: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * CreateWalletUseCase
 *
 * Caso de uso: Crear wallet para un usuario nuevo.
 *
 * Flujo:
 * 1. Validar que el usuario NO tenga wallet previa (1 user = 1 wallet)
 * 2. Crear nueva wallet con balance = 0
 * 3. Guardar en repositorio
 * 4. Retornar wallet creada
 *
 * Cuándo se ejecuta:
 * - Al registrar un nuevo usuario (automático en RegisterUserUseCase)
 * - Al migrar usuarios existentes sin wallet
 *
 * Reglas de negocio:
 * - Un usuario solo puede tener UNA wallet
 * - Balance inicial siempre es 0
 * - Status inicial siempre es ACTIVE
 *
 * @example
 * const useCase = new CreateWalletUseCase(walletRepository);
 * const result = await useCase.execute({ userId: 'user123' });
 * console.log(result.wallet.balance); // "0.0000"
 */
export class CreateWalletUseCase {
  constructor(private walletRepository: IWalletRepository) {}

  async execute(data: CreateWalletDTO): Promise<CreateWalletResponse> {
    // 1. Validar que el usuario no tenga wallet previa
    const walletExists = await this.walletRepository.existsByUserId(data.userId);

    if (walletExists) {
      throw new Error(`User ${data.userId} already has a wallet. Each user can only have one wallet.`);
    }

    // 2. Crear nueva wallet
    const wallet = Wallet.create({
      userId: data.userId,
      currency: data.currency || 'USD',
    });

    // 3. Guardar en repositorio
    const savedWallet = await this.walletRepository.save(wallet);

    // 4. Retornar respuesta
    return {
      wallet: savedWallet.toJSON(),
    };
  }
}
