import { IProductRepository } from '../../domain/repositories/IProductRepository';

/**
 * DTO para DeleteProductUseCase
 */
export interface DeleteProductDTO {
  productId: string;
  providerId: string; // Para validar ownership
}

/**
 * Respuesta de DeleteProductUseCase
 */
export interface DeleteProductResponse {
  success: boolean;
  message: string;
}

/**
 * DeleteProductUseCase
 *
 * Caso de uso: Eliminar producto del marketplace.
 *
 * Flujo:
 * 1. Buscar producto por ID
 * 2. Validar que el producto existe
 * 3. Validar que el usuario es el owner (providerId)
 * 4. Validar que el producto puede ser eliminado (status)
 * 5. Eliminar producto del repositorio
 * 6. Retornar confirmación
 *
 * Cuándo se ejecuta:
 * - Provider elimina producto que ya no quiere vender
 * - Provider elimina producto duplicado o erróneo
 *
 * Reglas de negocio:
 * - Solo el owner puede eliminar el producto
 * - Productos con status "sold" NO pueden eliminarse (regla de negocio)
 * - Otros status (available, reserved, suspended) SÍ pueden eliminarse
 * - Se recomienda soft delete en repository
 *
 * @throws Error si producto no existe
 * @throws Error si usuario no es el owner
 * @throws Error si producto no puede ser eliminado (sold)
 *
 * @example
 * const useCase = new DeleteProductUseCase(productRepository);
 * const result = await useCase.execute({
 *   productId: 'prod_123',
 *   providerId: 'user_123'
 * });
 * console.log(result.success); // true
 */
export class DeleteProductUseCase {
  constructor(private productRepository: IProductRepository) {}

  async execute(data: DeleteProductDTO): Promise<DeleteProductResponse> {
    // 1. Buscar producto
    const product = await this.productRepository.findById(data.productId);

    if (!product) {
      throw new Error(`Product not found: ${data.productId}`);
    }

    // 2. Validar ownership
    if (!product.isOwnedBy(data.providerId)) {
      throw new Error('Unauthorized: You can only delete your own products');
    }

    // 3. Validar que puede ser eliminado
    if (!product.canBeDeleted()) {
      throw new Error(
        'Cannot delete sold products. Sold products must remain in the system for audit purposes.'
      );
    }

    // 4. Eliminar producto
    const deleted = await this.productRepository.delete(data.productId);

    if (!deleted) {
      throw new Error('Failed to delete product');
    }

    // 5. Retornar confirmación
    return {
      success: true,
      message: `Product ${data.productId} deleted successfully`,
    };
  }
}
