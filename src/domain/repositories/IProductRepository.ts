import { Product } from '../entities/Product';
import { ProductStatus } from '../value-objects/ProductStatus';

/**
 * IProductRepository
 *
 * Contrato de persistencia para la entidad Product (Domain Layer).
 *
 * Implementaciones:
 * - PrismaProductRepository (Infrastructure Layer)
 * - InMemoryProductRepository (Testing)
 *
 * Principios DDD:
 * - Esta interfaz pertenece al Domain Layer
 * - Las implementaciones están en Infrastructure Layer
 * - Use Cases dependen SOLO de esta interfaz, no de implementaciones
 */
export interface IProductRepository {
  /**
   * Guarda un producto (create o update)
   *
   * Casos de uso:
   * - CreateProductUseCase: crear producto nuevo
   * - UpdateProductUseCase: actualizar precio, credentials, categoría
   * - ReserveProductUseCase: cambiar status a reserved
   * - MarkProductAsSoldUseCase: cambiar status a sold
   *
   * IMPORTANTE: accountPassword debe ser encriptado antes de guardar
   *
   * @param product - Entidad Product a guardar
   * @returns Product guardado (con cambios de persistencia si aplica)
   */
  save(product: Product): Promise<Product>;

  /**
   * Busca producto por ID
   *
   * Casos de uso:
   * - UpdateProductUseCase: obtener producto antes de actualizar
   * - PurchaseProductUseCase: verificar que producto existe
   *
   * @param id - ID del producto
   * @returns Product si existe, null si no
   */
  findById(id: string): Promise<Product | null>;

  /**
   * Lista todos los productos de un provider
   *
   * Casos de uso:
   * - ListMyProductsUseCase: provider ve sus productos
   * - Admin dashboard: ver productos por provider
   *
   * @param providerId - ID del usuario provider
   * @returns Array de productos del provider (puede estar vacío)
   */
  findByProviderId(providerId: string): Promise<Product[]>;

  /**
   * Lista productos disponibles para compra
   *
   * Casos de uso:
   * - ListAvailableProductsUseCase: mostrar catálogo a compradores
   * - Filters: por categoría, precio, etc.
   *
   * @param filters - Filtros opcionales (category, minPrice, maxPrice)
   * @returns Array de productos con status = available
   */
  findAvailable(filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<Product[]>;

  /**
   * Busca productos por categoría
   *
   * Casos de uso:
   * - Filtrado por categoría (netflix, spotify, etc)
   *
   * @param category - Categoría del producto
   * @returns Array de productos de esa categoría
   */
  findByCategory(category: string): Promise<Product[]>;

  /**
   * Busca productos por status
   *
   * Casos de uso:
   * - Admin dashboard: ver productos suspendidos
   * - Cleanup: cancelar reservas expiradas
   *
   * @param status - Status del producto
   * @returns Array de productos con ese status
   */
  findByStatus(status: ProductStatus): Promise<Product[]>;

  /**
   * Cuenta productos de un provider
   *
   * Casos de uso:
   * - Provider dashboard: mostrar cantidad de productos
   * - Validaciones: limitar productos por provider
   *
   * @param providerId - ID del usuario provider
   * @returns Número de productos del provider
   */
  countByProviderId(providerId: string): Promise<number>;

  /**
   * Cuenta productos disponibles por categoría
   *
   * Casos de uso:
   * - Mostrar estadísticas del marketplace
   *
   * @param category - Categoría del producto
   * @returns Número de productos disponibles
   */
  countAvailableByCategory(category: string): Promise<number>;

  /**
   * Elimina un producto (soft delete recomendado)
   *
   * NOTA: Por reglas de negocio, NO se pueden eliminar productos sold.
   * Esta validación debe hacerse en el Use Case o en la Entity.
   *
   * @param id - ID del producto a eliminar
   * @returns true si se eliminó, false si no existía
   */
  delete(id: string): Promise<boolean>;
}
