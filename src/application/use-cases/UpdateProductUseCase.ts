import { Money } from '../../domain/value-objects/Money';
import { IProductRepository } from '../../domain/repositories/IProductRepository';

/**
 * DTO para UpdateProductUseCase
 */
export interface UpdateProductDTO {
  productId: string;
  providerId: string; // Para validar ownership
  category?: string;
  price?: number | string;
  currency?: string;
  accountEmail?: string;
  accountPassword?: string;
}

/**
 * Respuesta de UpdateProductUseCase
 */
export interface UpdateProductResponse {
  product: {
    id: string;
    providerId: string;
    category: string;
    price: string;
    currency: string;
    accountEmail: string;
    status: string;
    updatedAt: Date;
  };
}

/**
 * UpdateProductUseCase
 *
 * Caso de uso: Actualizar producto existente.
 *
 * Flujo:
 * 1. Buscar producto por ID
 * 2. Validar que el producto existe
 * 3. Validar que el usuario es el owner (providerId)
 * 4. Validar que el producto puede ser editado (status)
 * 5. Actualizar campos proporcionados
 * 6. Guardar producto actualizado
 * 7. Retornar producto actualizado
 *
 * Cuándo se ejecuta:
 * - Provider actualiza precio de su producto
 * - Provider actualiza credenciales de cuenta
 * - Provider cambia categoría
 *
 * Reglas de negocio:
 * - Solo el owner puede actualizar el producto
 * - Solo productos con status "available" o "suspended" pueden editarse
 * - Productos "sold" NO pueden editarse
 * - Si se actualiza precio, debe ser positivo
 * - accountPassword se encriptará automáticamente en repository
 *
 * @throws Error si producto no existe
 * @throws Error si usuario no es el owner
 * @throws Error si producto no puede ser editado
 *
 * @example
 * const useCase = new UpdateProductUseCase(productRepository);
 * const result = await useCase.execute({
 *   productId: 'prod_123',
 *   providerId: 'user_123',
 *   price: 19.99,
 *   accountEmail: 'new@netflix.com'
 * });
 */
export class UpdateProductUseCase {
  constructor(private productRepository: IProductRepository) {}

  async execute(data: UpdateProductDTO): Promise<UpdateProductResponse> {
    // 1. Buscar producto
    const product = await this.productRepository.findById(data.productId);

    if (!product) {
      throw new Error(`Product not found: ${data.productId}`);
    }

    // 2. Validar ownership
    if (!product.isOwnedBy(data.providerId)) {
      throw new Error('Unauthorized: You can only update your own products');
    }

    // 3. Validar que puede ser editado
    if (!product.canBeEdited()) {
      throw new Error(`Cannot edit product with status: ${product.status.value}`);
    }

    // 4. Actualizar campos proporcionados

    // Actualizar credenciales
    if (data.accountEmail || data.accountPassword) {
      const newEmail = data.accountEmail || product.accountEmail;
      const newPassword = data.accountPassword || product.accountPassword;
      product.updateCredentials(newEmail, newPassword);
    }

    // Actualizar precio
    if (data.price !== undefined) {
      const currency = data.currency || product.price.currency;
      const newPrice = Money.create(data.price, currency);
      product.updatePrice(newPrice);
    }

    // Actualizar categoría
    if (data.category) {
      product.updateCategory(data.category);
    }

    // 5. Guardar producto actualizado
    const updatedProduct = await this.productRepository.save(product);

    // 6. Retornar respuesta
    return {
      product: updatedProduct.toJSON(),
    };
  }
}
