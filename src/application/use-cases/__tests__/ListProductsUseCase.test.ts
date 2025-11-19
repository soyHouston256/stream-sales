import { ListProductsUseCase } from '../ListProductsUseCase';
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
    let results = Array.from(this.products.values()).filter((p) => p.status.isAvailable());

    // Apply category filter
    if (filters?.category) {
      results = results.filter((p) => p.category === filters.category.toLowerCase());
    }

    // Apply price filters
    if (filters?.minPrice !== undefined) {
      results = results.filter((p) => p.price.toNumber() >= filters.minPrice);
    }
    if (filters?.maxPrice !== undefined) {
      results = results.filter((p) => p.price.toNumber() <= filters.maxPrice);
    }

    // Sort by createdAt desc
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const start = filters?.offset || 0;
    const end = filters?.limit ? start + filters.limit : results.length;

    return results.slice(start, end);
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
      // Manually set status for testing
      (product as any).props.status = data.status;
    }

    return this.save(product);
  }
}

describe('ListProductsUseCase', () => {
  let useCase: ListProductsUseCase;
  let repository: MockProductRepository;

  beforeEach(() => {
    repository = new MockProductRepository();
    useCase = new ListProductsUseCase(repository);
  });

  describe('execute', () => {
    it('should list all available products', async () => {
      await repository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });
      await repository.createProduct({
        providerId: 'provider2',
        category: 'spotify',
        price: 12.99,
      });

      const result = await useCase.execute();

      expect(result.products.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should only return available products', async () => {
      await repository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });
      await repository.createProduct({
        providerId: 'provider2',
        category: 'spotify',
        price: 12.99,
        status: ProductStatus.sold(),
      });
      await repository.createProduct({
        providerId: 'provider3',
        category: 'hbo',
        price: 19.99,
        status: ProductStatus.suspended(),
      });

      const result = await useCase.execute();

      expect(result.products.length).toBe(1);
      expect(result.products[0].category).toBe('netflix');
    });

    it('should filter by category', async () => {
      await repository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });
      await repository.createProduct({
        providerId: 'provider2',
        category: 'netflix',
        price: 16.99,
      });
      await repository.createProduct({
        providerId: 'provider3',
        category: 'spotify',
        price: 12.99,
      });

      const result = await useCase.execute({ category: 'netflix' });

      expect(result.products.length).toBe(2);
      expect(result.products.every((p) => p.category === 'netflix')).toBe(true);
    });

    it('should filter by minimum price', async () => {
      await repository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 10.99,
      });
      await repository.createProduct({
        providerId: 'provider2',
        category: 'spotify',
        price: 15.99,
      });
      await repository.createProduct({
        providerId: 'provider3',
        category: 'hbo',
        price: 20.99,
      });

      const result = await useCase.execute({ minPrice: 15 });

      expect(result.products.length).toBe(2);
      expect(result.products.every((p) => parseFloat(p.price) >= 15)).toBe(true);
    });

    it('should filter by maximum price', async () => {
      await repository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 10.99,
      });
      await repository.createProduct({
        providerId: 'provider2',
        category: 'spotify',
        price: 15.99,
      });
      await repository.createProduct({
        providerId: 'provider3',
        category: 'hbo',
        price: 20.99,
      });

      const result = await useCase.execute({ maxPrice: 16 });

      expect(result.products.length).toBe(2);
      expect(result.products.every((p) => parseFloat(p.price) <= 16)).toBe(true);
    });

    it('should filter by price range', async () => {
      await repository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 10.99,
      });
      await repository.createProduct({
        providerId: 'provider2',
        category: 'spotify',
        price: 15.99,
      });
      await repository.createProduct({
        providerId: 'provider3',
        category: 'hbo',
        price: 20.99,
      });

      const result = await useCase.execute({ minPrice: 12, maxPrice: 18 });

      expect(result.products.length).toBe(1);
      expect(result.products[0].category).toBe('spotify');
    });

    it('should apply pagination with limit', async () => {
      // Create 5 products
      for (let i = 1; i <= 5; i++) {
        await repository.createProduct({
          providerId: `provider${i}`,
          category: 'netflix',
          price: 10 + i,
        });
      }

      const result = await useCase.execute({ limit: 3 });

      expect(result.products.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it('should apply pagination with offset', async () => {
      // Create 5 products
      for (let i = 1; i <= 5; i++) {
        await repository.createProduct({
          providerId: `provider${i}`,
          category: 'netflix',
          price: 10 + i,
        });
      }

      const result = await useCase.execute({ limit: 2, offset: 2 });

      expect(result.products.length).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it('should return hasMore false when no more products', async () => {
      await repository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });
      await repository.createProduct({
        providerId: 'provider2',
        category: 'spotify',
        price: 12.99,
      });

      const result = await useCase.execute({ limit: 5 });

      expect(result.products.length).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should use default limit of 20', async () => {
      // Create 25 products
      for (let i = 1; i <= 25; i++) {
        await repository.createProduct({
          providerId: `provider${i}`,
          category: 'netflix',
          price: 10 + i,
        });
      }

      const result = await useCase.execute();

      expect(result.products.length).toBe(20);
      expect(result.hasMore).toBe(true);
    });

    it('should combine filters with pagination', async () => {
      // Create netflix products
      for (let i = 1; i <= 10; i++) {
        await repository.createProduct({
          providerId: `provider${i}`,
          category: 'netflix',
          price: 10 + i,
        });
      }
      // Create spotify products
      for (let i = 1; i <= 5; i++) {
        await repository.createProduct({
          providerId: `provider_spotify${i}`,
          category: 'spotify',
          price: 8 + i,
        });
      }

      const result = await useCase.execute({
        category: 'netflix',
        minPrice: 12,
        maxPrice: 18,
        limit: 3,
      });

      expect(result.products.length).toBe(3);
      expect(result.products.every((p) => p.category === 'netflix')).toBe(true);
      expect(result.products.every((p) => parseFloat(p.price) >= 12 && parseFloat(p.price) <= 18)).toBe(true);
    });

    it('should not include accountPassword in response', async () => {
      await repository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute();

      expect((result.products[0] as any).accountPassword).toBeUndefined();
    });

    it('should return empty array when no products match', async () => {
      await repository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({ category: 'hbo' });

      expect(result.products.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should return empty array when no products exist', async () => {
      const result = await useCase.execute();

      expect(result.products.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });
});
