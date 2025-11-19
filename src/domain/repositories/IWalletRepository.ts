import { Wallet } from '../entities/Wallet';

/**
 * IWalletRepository
 *
 * Contrato de persistencia para la entidad Wallet (Domain Layer).
 *
 * Implementaciones:
 * - PrismaWalletRepository (Infrastructure Layer)
 * - InMemoryWalletRepository (Testing)
 *
 * Principios DDD:
 * - Esta interfaz pertenece al Domain Layer
 * - Las implementaciones están en Infrastructure Layer
 * - Use Cases dependen SOLO de esta interfaz, no de implementaciones
 */
export interface IWalletRepository {
  /**
   * Guarda una wallet (create o update)
   *
   * Casos de uso:
   * - CreateWalletUseCase: crear wallet al registrar usuario
   * - CreditBalanceUseCase: actualizar balance después de crédito
   * - DebitBalanceUseCase: actualizar balance después de débito
   *
   * @param wallet - Entidad Wallet a guardar
   * @returns Wallet guardada (con cambios de persistencia si aplica)
   */
  save(wallet: Wallet): Promise<Wallet>;

  /**
   * Busca wallet por ID
   *
   * Casos de uso:
   * - GetWalletBalanceUseCase
   *
   * @param id - ID de la wallet
   * @returns Wallet si existe, null si no
   */
  findById(id: string): Promise<Wallet | null>;

  /**
   * Busca wallet por ID de usuario
   *
   * CRÍTICO: Un usuario solo puede tener UNA wallet.
   *
   * Casos de uso:
   * - CreateWalletUseCase: verificar que no exista wallet previa
   * - CreditBalanceUseCase: obtener wallet del usuario
   * - DebitBalanceUseCase: obtener wallet del usuario
   * - TransferMoneyUseCase: obtener wallets de sender y receiver
   *
   * @param userId - ID del usuario
   * @returns Wallet del usuario si existe, null si no
   */
  findByUserId(userId: string): Promise<Wallet | null>;

  /**
   * Verifica si un usuario ya tiene wallet
   *
   * Casos de uso:
   * - CreateWalletUseCase: prevenir duplicados (regla de negocio)
   *
   * @param userId - ID del usuario
   * @returns true si el usuario tiene wallet, false si no
   */
  existsByUserId(userId: string): Promise<boolean>;

  /**
   * Elimina una wallet (soft delete recomendado)
   *
   * NOTA: Por reglas de negocio, solo se puede eliminar con balance = 0.
   * Esta validación debe hacerse en el Use Case o en la Entity.
   *
   * @param id - ID de la wallet a eliminar
   * @returns true si se eliminó, false si no existía
   */
  delete(id: string): Promise<boolean>;
}
