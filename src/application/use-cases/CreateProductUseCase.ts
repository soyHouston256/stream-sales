import { Product } from '../../domain/entities/Product';
import { Money } from '../../domain/value-objects/Money';
import { IProductRepository } from '../../domain/repositories/IProductRepository';

/**
 * DTO para CreateProductUseCase
 */
export interface CreateProductDTO {
  providerId: string;
  category: string;
  price: number | string;
  currency?: string;
  accountEmail: string;
  accountPassword: string;
}

/**
 * Respuesta de CreateProductUseCase
 */
export interface CreateProductResponse {
  product: {
    id: string;
    providerId: string;
    category: string;
    price: string;
    currency: string;
    accountEmail: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * CreateProductUseCase
 *
 * Caso de uso: Crear nuevo producto en el marketplace.
 *
 * Flujo:
 * 1. Validar que el usuario tenga rol de provider
 * 2. Crear Money Value Object con el precio
 * 3. Crear Product Entity con status = available
 * 4. Guardar en repositorio (accountPassword se encriptará automáticamente)
 * 5. Retornar producto creado
 *
 * Cuándo se ejecuta:
 * - Provider publica nuevo producto digital (cuenta de servicio)
 *
 * Reglas de negocio:
 * - Solo usuarios con rol "provider" pueden crear productos
 * - Price debe ser positivo
 * - Category, accountEmail, accountPassword son requeridos
 * - accountPassword se encriptará en el repository
 * - Status inicial siempre es "available"
 *
 * @example
 * const useCase = new CreateProductUseCase(productRepository);
 * const result = await useCase.execute({
 *   providerId: 'user123',
 *   category: 'netflix',
 *   price: 15.99,
 *   accountEmail: 'account@netflix.com',
 *   accountPassword: 'plain_password'
 * });
 * console.log(result.product.id); // "prod_abc123"
 */
export class CreateProductUseCase {
  constructor(private productRepository: IProductRepository) {}

  async execute(data: CreateProductDTO): Promise<CreateProductResponse> {
    // 1. Crear Money Value Object
    const currency = data.currency || 'USD';
    const price = Money.create(data.price, currency);

    // 2. Validar que el precio sea positivo (Money.create ya valida, pero por claridad)
    if (!price.isPositive()) {
      throw new Error('Product price must be positive');
    }

    // 3. Crear Product Entity
    // La entity validará: category, accountEmail, accountPassword requeridos
    const product = Product.create({
      providerId: data.providerId,
      category: data.category,
      price,
      accountEmail: data.accountEmail,
      accountPassword: data.accountPassword,
    });

    // 4. Guardar en repositorio
    // IMPORTANTE: PrismaProductRepository encriptará accountPassword automáticamente
    const savedProduct = await this.productRepository.save(product);

    // 5. Retornar respuesta
    // IMPORTANTE: toJSON() NO incluye accountPassword por seguridad
    return {
      product: savedProduct.toJSON(),
    };
  }
}
