import { IProductRepository } from '../../domain/repositories/IProductRepository';

/**
 * DTO para ListProductsUseCase
 */
export interface ListProductsDTO {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}

/**
 * Respuesta de ListProductsUseCase
 */
export interface ListProductsResponse {
  products: Array<{
    id: string;
    providerId: string;
    category: string;
    price: string;
    currency: string;
    accountEmail: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  hasMore: boolean;
}

/**
 * ListProductsUseCase
 *
 * Caso de uso: Listar productos disponibles en el marketplace.
 *
 * Flujo:
 * 1. Aplicar filtros opcionales (category, price range)
 * 2. Buscar productos con status = available
 * 3. Aplicar paginación (limit, offset)
 * 4. Retornar lista de productos
 *
 * Cuándo se ejecuta:
 * - Catálogo público para compradores
 * - Búsqueda de productos por categoría
 * - Filtrado por rango de precio
 *
 * Reglas de negocio:
 * - Solo retorna productos con status = "available"
 * - Ordenados por fecha de creación (más recientes primero)
 * - accountPassword NO se incluye en la respuesta
 * - Paginación por defecto: limit = 20, offset = 0
 *
 * @example
 * const useCase = new ListProductsUseCase(productRepository);
 * const result = await useCase.execute({
 *   category: 'netflix',
 *   minPrice: 10,
 *   maxPrice: 20,
 *   limit: 10
 * });
 * console.log(result.products.length); // <= 10
 */
export class ListProductsUseCase {
  constructor(private productRepository: IProductRepository) {}

  async execute(data: ListProductsDTO = {}): Promise<ListProductsResponse> {
    // 1. Establecer valores por defecto para paginación
    const limit = data.limit || 20;
    const offset = data.offset || 0;

    // 2. Buscar productos disponibles con filtros
    const products = await this.productRepository.findAvailable({
      category: data.category,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      limit: limit + 1, // Pedir uno más para saber si hay más páginas
      offset,
    });

    // 3. Determinar si hay más páginas
    const hasMore = products.length > limit;
    const resultProducts = hasMore ? products.slice(0, limit) : products;

    // 4. Serializar productos (sin accountPassword)
    const serializedProducts = resultProducts.map((product) => product.toJSON());

    // 5. Retornar respuesta
    return {
      products: serializedProducts,
      total: resultProducts.length,
      hasMore,
    };
  }
}
