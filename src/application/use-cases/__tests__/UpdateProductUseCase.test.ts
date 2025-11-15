import { UpdateProductUseCase } from '../UpdateProductUseCase';
import { Product } from '../../../domain/entities/Product';
import { Money } from '../../../domain/value-objects/Money';
import { ProductStatus } from '../../../domain/value-objects/ProductStatus';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';

// Mock del repository
class MockProductRepository implements IProductRepository {
  private products: Map<string, Product> = new Map();

  async save(product: Product): Promise<Product> {
    this.products.set(product.id, product);
    return product;
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  async findByProviderId(providerId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) => p.providerId === providerId);
  }

  async findAvailable(filters?: any): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) => p.status.isAvailable());
  }

  async findByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) => p.category === category);
  }

  async findByStatus(status: ProductStatus): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) => p.status.equals(status));
  }

  async countByProviderId(providerId: string): Promise<number> {
    return this.findByProviderId(providerId).then((products) => products.length);
  }

  async countAvailableByCategory(category: string): Promise<number> {
    return this.findByCategory(category).then(
      (products) => products.filter((p) => p.status.isAvailable()).length
    );
  }

  async delete(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  // Helper for tests
  async createProduct(data: {
    providerId: string;
    category: string;
    price: number;
    accountEmail?: string;
    accountPassword?: string;
    status?: ProductStatus;
  }): Promise<Product> {
    const product = Product.create({
      providerId: data.providerId,
      category: data.category,
      price: Money.create(data.price),
      accountEmail: data.accountEmail || `account@${data.category}.com`,
      accountPassword: data.accountPassword || 'password',
    });

    if (data.status) {
      (product as any).props.status = data.status;
    }

    return this.save(product);
  }
}

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;
  let repository: MockProductRepository;

  beforeEach(() => {
    repository = new MockProductRepository();
    useCase = new UpdateProductUseCase(repository);
  });

  describe('execute', () => {
    it('should update product price', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        price: 19.99,
      });

      expect(result.product.price).toBe('19.9900');
    });

    it('should update product category', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        category: 'hbo',
      });

      expect(result.product.category).toBe('hbo');
    });

    it('should update account credentials', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        accountEmail: 'old@netflix.com',
        accountPassword: 'old_password',
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        accountEmail: 'new@netflix.com',
        accountPassword: 'new_password',
      });

      expect(result.product.accountEmail).toBe('new@netflix.com');
    });

    it('should update only accountEmail', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        accountEmail: 'old@netflix.com',
        accountPassword: 'password',
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        accountEmail: 'new@netflix.com',
      });

      expect(result.product.accountEmail).toBe('new@netflix.com');
      // Password should remain the same
      const updatedProduct = await repository.findById(product.id);
      expect(updatedProduct?.accountPassword).toBe('password');
    });

    it('should update only accountPassword', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        accountEmail: 'account@netflix.com',
        accountPassword: 'old_password',
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        accountPassword: 'new_password',
      });

      const updatedProduct = await repository.findById(product.id);
      expect(updatedProduct?.accountPassword).toBe('new_password');
    });

    it('should update multiple fields at once', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        category: 'spotify',
        price: 12.99,
        accountEmail: 'new@spotify.com',
      });

      expect(result.product.category).toBe('spotify');
      expect(result.product.price).toBe('12.9900');
      expect(result.product.accountEmail).toBe('new@spotify.com');
    });

    it('should update timestamp', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      const originalTimestamp = product.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        price: 19.99,
      });

      const updatedProduct = await repository.findById(product.id);
      expect(updatedProduct!.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
    });

    it('should throw error if product not found', async () => {
      await expect(
        useCase.execute({
          productId: 'nonexistent',
          providerId: 'provider123',
          price: 19.99,
        })
      ).rejects.toThrow('Product not found');
    });

    it('should throw error if user is not the owner', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      await expect(
        useCase.execute({
          productId: product.id,
          providerId: 'other_provider',
          price: 19.99,
        })
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw error when updating sold product', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        status: ProductStatus.sold(),
      });

      await expect(
        useCase.execute({
          productId: product.id,
          providerId: 'provider123',
          price: 19.99,
        })
      ).rejects.toThrow('Cannot edit product');
    });

    it('should allow updating suspended product', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        status: ProductStatus.suspended(),
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        price: 19.99,
      });

      expect(result.product.price).toBe('19.9900');
    });

    it('should throw error when updating reserved product', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        status: ProductStatus.reserved(),
      });

      await expect(
        useCase.execute({
          productId: product.id,
          providerId: 'provider123',
          price: 19.99,
        })
      ).rejects.toThrow('Cannot edit product');
    });

    it('should throw error if new price is zero', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      await expect(
        useCase.execute({
          productId: product.id,
          providerId: 'provider123',
          price: 0,
        })
      ).rejects.toThrow('price must be positive');
    });

    it('should throw error if new price is negative', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      await expect(
        useCase.execute({
          productId: product.id,
          providerId: 'provider123',
          price: -10,
        })
      ).rejects.toThrow('price must be positive');
    });

    it('should normalize category to lowercase', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        category: 'SPOTIFY',
      });

      expect(result.product.category).toBe('spotify');
    });

    it('should not update category if empty string provided', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        category: '', // Empty string is ignored
      });

      // Category should remain unchanged
      expect(result.product.category).toBe('netflix');
    });

    it('should update price with custom currency', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        price: 12.99,
        currency: 'EUR',
      });

      expect(result.product.price).toBe('12.9900');
      expect(result.product.currency).toBe('EUR');
    });

    it('should not include accountPassword in response', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
        price: 19.99,
      });

      expect((result.product as any).accountPassword).toBeUndefined();
    });
  });
});
