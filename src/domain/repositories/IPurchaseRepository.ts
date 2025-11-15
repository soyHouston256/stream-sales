import { Purchase } from '../entities/Purchase';

/**
 * IPurchaseRepository
 *
 * Repository interface para Purchase (Domain Layer).
 * Define el contrato para operaciones de persistencia de compras.
 *
 * Principios DDD:
 * - Interface definida en Domain Layer (inversión de dependencias)
 * - Implementación concreta en Infrastructure Layer
 * - Use Cases dependen de esta abstracción, no de implementaciones concretas
 *
 * IMPORTANTE: Las compras son INMUTABLES (audit trail)
 * - No hay método update() porque las compras no se modifican después de creadas
 * - Son registros históricos de transacciones financieras
 */
export interface IPurchaseRepository {
  /**
   * Guardar nueva compra
   *
   * @param purchase - Purchase entity a persistir
   * @returns Purchase guardado con datos de persistencia
   * @throws Error si el productId ya existe (un producto solo se vende una vez)
   */
  save(purchase: Purchase): Promise<Purchase>;

  /**
   * Buscar compra por ID
   *
   * @param id - UUID de la compra
   * @returns Purchase si existe, null si no se encuentra
   */
  findById(id: string): Promise<Purchase | null>;

  /**
   * Buscar compra por productId
   *
   * Business Rule: Un producto solo puede ser vendido una vez
   * Esto permite verificar si un producto ya fue comprado
   *
   * @param productId - ID del producto
   * @returns Purchase si el producto fue vendido, null si aún no se ha vendido
   */
  findByProductId(productId: string): Promise<Purchase | null>;

  /**
   * Buscar todas las compras de un seller (buyer)
   *
   * Usado por ListMyPurchasesUseCase para mostrar historial de compras
   *
   * @param sellerId - ID del usuario que compró
   * @param filters - Filtros opcionales (paginación, fecha, etc.)
   * @returns Array de compras ordenadas por fecha descendente
   */
  findBySellerId(
    sellerId: string,
    filters?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Purchase[]>;

  /**
   * Contar total de compras de un seller
   *
   * Usado para analytics y paginación
   *
   * @param sellerId - ID del usuario
   * @returns Número total de compras
   */
  countBySellerId(sellerId: string): Promise<number>;

  /**
   * Buscar compras de un producto específico
   *
   * Útil para analytics del provider: ver quién compró sus productos
   *
   * @param productId - ID del producto
   * @returns Array de compras (debería ser máximo 1 por business rule)
   */
  findByProductId_All(productId: string): Promise<Purchase[]>;

  /**
   * Calcular total gastado por un seller
   *
   * Suma de todos los montos de compras de un usuario
   *
   * @param sellerId - ID del usuario
   * @returns Total amount gastado (como número)
   */
  getTotalSpentBySeller(sellerId: string): Promise<number>;

  /**
   * Calcular total de comisiones generadas
   *
   * Suma de todas las comisiones de admin
   *
   * @returns Total de comisiones (como número)
   */
  getTotalAdminCommissions(): Promise<number>;
}
