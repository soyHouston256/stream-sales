import { DeleteProductUseCase } from '../DeleteProductUseCase';
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
    status?: ProductStatus;
  }): Promise<Product> {
    const product = Product.create({
      providerId: data.providerId,
      category: data.category,
      price: Money.create(data.price),
      accountEmail: `account@${data.category}.com`,
      accountPassword: 'password',
    });

    if (data.status) {
      (product as any).props.status = data.status;
    }

    return this.save(product);
  }
}

describe('DeleteProductUseCase', () => {
  let useCase: DeleteProductUseCase;
  let repository: MockProductRepository;

  beforeEach(() => {
    repository = new MockProductRepository();
    useCase = new DeleteProductUseCase(repository);
  });

  describe('execute', () => {
    it('should delete available product successfully', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');

      // Verify product was deleted
      const deletedProduct = await repository.findById(product.id);
      expect(deletedProduct).toBeNull();
    });

    it('should delete suspended product', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        status: ProductStatus.suspended(),
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
      });

      expect(result.success).toBe(true);

      const deletedProduct = await repository.findById(product.id);
      expect(deletedProduct).toBeNull();
    });

    it('should delete reserved product', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        status: ProductStatus.reserved(),
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
      });

      expect(result.success).toBe(true);
    });

    it('should throw error if product not found', async () => {
      await expect(
        useCase.execute({
          productId: 'nonexistent',
          providerId: 'provider123',
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
        })
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw error when deleting sold product', async () => {
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
        })
      ).rejects.toThrow('Cannot delete sold products');
    });

    it('should include audit trail message for sold products', async () => {
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
        })
      ).rejects.toThrow('audit purposes');
    });

    it('should return success true when deletion succeeds', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
      });

      expect(result.success).toBe(true);
      expect(typeof result.message).toBe('string');
    });

    it('should include product ID in success message', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        productId: product.id,
        providerId: 'provider123',
      });

      expect(result.message).toContain(product.id);
    });

    it('should verify product is removed from repository', async () => {
      const product1 = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });
      const product2 = await repository.createProduct({
        providerId: 'provider123',
        category: 'spotify',
        price: 12.99,
      });

      await useCase.execute({
        productId: product1.id,
        providerId: 'provider123',
      });

      const remainingProducts = await repository.findByProviderId('provider123');
      expect(remainingProducts.length).toBe(1);
      expect(remainingProducts[0].id).toBe(product2.id);
    });

    it('should handle multiple sequential deletions', async () => {
      const product1 = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
      });
      const product2 = await repository.createProduct({
        providerId: 'provider123',
        category: 'spotify',
        price: 12.99,
      });
      const product3 = await repository.createProduct({
        providerId: 'provider123',
        category: 'hbo',
        price: 19.99,
      });

      await useCase.execute({
        productId: product1.id,
        providerId: 'provider123',
      });
      await useCase.execute({
        productId: product2.id,
        providerId: 'provider123',
      });
      await useCase.execute({
        productId: product3.id,
        providerId: 'provider123',
      });

      const remainingProducts = await repository.findByProviderId('provider123');
      expect(remainingProducts.length).toBe(0);
    });

    it('should not delete product if validation fails', async () => {
      const product = await repository.createProduct({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        status: ProductStatus.sold(),
      });

      try {
        await useCase.execute({
          productId: product.id,
          providerId: 'provider123',
        });
      } catch (error) {
        // Error expected
      }

      // Product should still exist
      const existingProduct = await repository.findById(product.id);
      expect(existingProduct).not.toBeNull();
    });

    it('should allow different providers to delete their own products', async () => {
      const product1 = await repository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });
      const product2 = await repository.createProduct({
        providerId: 'provider2',
        category: 'spotify',
        price: 12.99,
      });

      await useCase.execute({
        productId: product1.id,
        providerId: 'provider1',
      });
      await useCase.execute({
        productId: product2.id,
        providerId: 'provider2',
      });

      const deleted1 = await repository.findById(product1.id);
      const deleted2 = await repository.findById(product2.id);

      expect(deleted1).toBeNull();
      expect(deleted2).toBeNull();
    });
  });
});
