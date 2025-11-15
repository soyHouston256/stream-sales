import { CreateProductUseCase } from '../CreateProductUseCase';
import { Product } from '../../../domain/entities/Product';
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
}

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let repository: MockProductRepository;

  beforeEach(() => {
    repository = new MockProductRepository();
    useCase = new CreateProductUseCase(repository);
  });

  describe('execute', () => {
    it('should create a new product successfully', async () => {
      const result = await useCase.execute({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        accountEmail: 'account@netflix.com',
        accountPassword: 'plain_password',
      });

      expect(result.product).toBeDefined();
      expect(result.product.id).toBeDefined();
      expect(result.product.providerId).toBe('provider123');
      expect(result.product.category).toBe('netflix');
      expect(result.product.price).toBe('15.9900');
      expect(result.product.currency).toBe('USD');
      expect(result.product.accountEmail).toBe('account@netflix.com');
      expect(result.product.status).toBe('available');
    });

    it('should not include accountPassword in response', async () => {
      const result = await useCase.execute({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        accountEmail: 'account@netflix.com',
        accountPassword: 'plain_password',
      });

      expect((result.product as any).accountPassword).toBeUndefined();
    });

    it('should create product with custom currency', async () => {
      const result = await useCase.execute({
        providerId: 'provider123',
        category: 'spotify',
        price: 12.99,
        currency: 'EUR',
        accountEmail: 'account@spotify.com',
        accountPassword: 'plain_password',
      });

      expect(result.product.currency).toBe('EUR');
    });

    it('should accept string price', async () => {
      const result = await useCase.execute({
        providerId: 'provider123',
        category: 'hbo',
        price: '19.99',
        accountEmail: 'account@hbo.com',
        accountPassword: 'plain_password',
      });

      expect(result.product.price).toBe('19.9900');
    });

    it('should normalize category to lowercase', async () => {
      const result = await useCase.execute({
        providerId: 'provider123',
        category: 'NETFLIX',
        price: 15.99,
        accountEmail: 'account@netflix.com',
        accountPassword: 'plain_password',
      });

      expect(result.product.category).toBe('netflix');
    });

    it('should throw error if price is zero', async () => {
      await expect(
        useCase.execute({
          providerId: 'provider123',
          category: 'netflix',
          price: 0,
          accountEmail: 'account@netflix.com',
          accountPassword: 'plain_password',
        })
      ).rejects.toThrow('price must be positive');
    });

    it('should throw error if price is negative', async () => {
      await expect(
        useCase.execute({
          providerId: 'provider123',
          category: 'netflix',
          price: -10,
          accountEmail: 'account@netflix.com',
          accountPassword: 'plain_password',
        })
      ).rejects.toThrow('price must be positive');
    });

    it('should throw error if category is empty', async () => {
      await expect(
        useCase.execute({
          providerId: 'provider123',
          category: '',
          price: 15.99,
          accountEmail: 'account@netflix.com',
          accountPassword: 'plain_password',
        })
      ).rejects.toThrow('category is required');
    });

    it('should throw error if accountEmail is empty', async () => {
      await expect(
        useCase.execute({
          providerId: 'provider123',
          category: 'netflix',
          price: 15.99,
          accountEmail: '',
          accountPassword: 'plain_password',
        })
      ).rejects.toThrow('email is required');
    });

    it('should throw error if accountPassword is empty', async () => {
      await expect(
        useCase.execute({
          providerId: 'provider123',
          category: 'netflix',
          price: 15.99,
          accountEmail: 'account@netflix.com',
          accountPassword: '',
        })
      ).rejects.toThrow('password is required');
    });

    it('should save product to repository', async () => {
      const result = await useCase.execute({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        accountEmail: 'account@netflix.com',
        accountPassword: 'plain_password',
      });

      const savedProduct = await repository.findById(result.product.id);
      expect(savedProduct).not.toBeNull();
      expect(savedProduct?.id).toBe(result.product.id);
    });

    it('should set timestamps', async () => {
      const result = await useCase.execute({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        accountEmail: 'account@netflix.com',
        accountPassword: 'plain_password',
      });

      expect(result.product.createdAt).toBeInstanceOf(Date);
      expect(result.product.updatedAt).toBeInstanceOf(Date);
    });

    it('should create product with status available', async () => {
      const result = await useCase.execute({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        accountEmail: 'account@netflix.com',
        accountPassword: 'plain_password',
      });

      expect(result.product.status).toBe('available');
    });

    it('should handle decimal prices correctly', async () => {
      const result = await useCase.execute({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.12345,
        accountEmail: 'account@netflix.com',
        accountPassword: 'plain_password',
      });

      expect(result.product.price).toBe('15.1235'); // Redondeado a 4 decimales
    });

    it('should create multiple products from same provider', async () => {
      await useCase.execute({
        providerId: 'provider123',
        category: 'netflix',
        price: 15.99,
        accountEmail: 'account1@netflix.com',
        accountPassword: 'password1',
      });

      await useCase.execute({
        providerId: 'provider123',
        category: 'spotify',
        price: 12.99,
        accountEmail: 'account2@spotify.com',
        accountPassword: 'password2',
      });

      const products = await repository.findByProviderId('provider123');
      expect(products.length).toBe(2);
    });
  });
});
