import { PurchaseProductUseCase } from '../PurchaseProductUseCase';
import { Wallet } from '../../../domain/entities/Wallet';
import { Product } from '../../../domain/entities/Product';
import { Purchase } from '../../../domain/entities/Purchase';
import { Money } from '../../../domain/value-objects/Money';
import { ProductStatus } from '../../../domain/value-objects/ProductStatus';
import { IWalletRepository } from '../../../domain/repositories/IWalletRepository';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { IPurchaseRepository } from '../../../domain/repositories/IPurchaseRepository';

// ============================================
// MOCK REPOSITORIES
// ============================================

class MockWalletRepository implements IWalletRepository {
  private wallets: Map<string, Wallet> = new Map();

  async save(wallet: Wallet): Promise<Wallet> {
    this.wallets.set(wallet.id, wallet);
    return wallet;
  }

  async findById(id: string): Promise<Wallet | null> {
    return this.wallets.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    return (
      Array.from(this.wallets.values()).find((w) => w.userId === userId) || null
    );
  }

  async existsByUserId(userId: string): Promise<boolean> {
    return Array.from(this.wallets.values()).some((w) => w.userId === userId);
  }

  async delete(id: string): Promise<boolean> {
    return this.wallets.delete(id);
  }

  // Helper for tests
  async createWallet(userId: string, balance: number): Promise<Wallet> {
    const wallet = Wallet.create({
      userId,
      currency: 'USD',
    });

    if (balance > 0) {
      wallet.credit(Money.create(balance));
    }

    return this.save(wallet);
  }
}

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
    return Array.from(this.products.values()).filter(
      (p) => p.providerId === providerId
    );
  }

  async findAvailable(filters?: any): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) =>
      p.status.isAvailable()
    );
  }

  async findByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (p) => p.category === category
    );
  }

  async findByStatus(status: ProductStatus): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) =>
      p.status.equals(status)
    );
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
      accountPassword: 'password123',
    });

    if (data.status) {
      (product as any).props.status = data.status;
    }

    return this.save(product);
  }
}

class MockPurchaseRepository implements IPurchaseRepository {
  private purchases: Map<string, Purchase> = new Map();

  async save(purchase: Purchase): Promise<Purchase> {
    // Verificar que el productId no exista ya (business rule)
    const existing = await this.findByProductId(purchase.productId);
    if (existing) {
      throw new Error('Product already sold');
    }

    this.purchases.set(purchase.id, purchase);
    return purchase;
  }

  async findById(id: string): Promise<Purchase | null> {
    return this.purchases.get(id) || null;
  }

  async findByProductId(productId: string): Promise<Purchase | null> {
    return (
      Array.from(this.purchases.values()).find(
        (p) => p.productId === productId
      ) || null
    );
  }

  async findBySellerId(
    sellerId: string,
    filters?: any
  ): Promise<Purchase[]> {
    return Array.from(this.purchases.values()).filter(
      (p) => p.sellerId === sellerId
    );
  }

  async countBySellerId(sellerId: string): Promise<number> {
    return this.findBySellerId(sellerId).then((purchases) => purchases.length);
  }

  async findByProductId_All(productId: string): Promise<Purchase[]> {
    return Array.from(this.purchases.values()).filter(
      (p) => p.productId === productId
    );
  }

  async getTotalSpentBySeller(sellerId: string): Promise<number> {
    const purchases = await this.findBySellerId(sellerId);
    return purchases.reduce((sum, p) => sum + p.amount.toNumber(), 0);
  }

  async getTotalAdminCommissions(): Promise<number> {
    return Array.from(this.purchases.values()).reduce(
      (sum, p) => sum + p.adminCommission.toNumber(),
      0
    );
  }
}

// ============================================
// TESTS
// ============================================

describe('PurchaseProductUseCase', () => {
  let useCase: PurchaseProductUseCase;
  let walletRepository: MockWalletRepository;
  let productRepository: MockProductRepository;
  let purchaseRepository: MockPurchaseRepository;

  beforeEach(() => {
    walletRepository = new MockWalletRepository();
    productRepository = new MockProductRepository();
    purchaseRepository = new MockPurchaseRepository();
    useCase = new PurchaseProductUseCase(
      walletRepository,
      productRepository,
      purchaseRepository
    );
  });

  describe('execute', () => {
    it('should successfully purchase a product', async () => {
      // Setup: Create seller, provider, admin wallets
      const sellerWallet = await walletRepository.createWallet('seller1', 100);
      const providerWallet = await walletRepository.createWallet('provider1', 0);
      const adminWallet = await walletRepository.createWallet('admin', 0);

      // Setup: Create available product
      const product = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });

      // Execute purchase
      const result = await useCase.execute({
        sellerId: 'seller1',
        productId: product.id,
      });

      // Verify purchase was created
      expect(result.purchase.id).toBeDefined();
      expect(result.purchase.sellerId).toBe('seller1');
      expect(result.purchase.productId).toBe(product.id);
      expect(result.purchase.amount).toBe('15.9900');

      // Verify commission (5% of 15.99 = 0.7995)
      expect(result.purchase.adminCommission).toBe('0.7995');

      // Verify provider earnings (15.99 - 0.7995 = 15.1905)
      expect(result.purchase.providerEarnings).toBe('15.1905');

      // Verify seller wallet was debited
      const updatedSellerWallet = await walletRepository.findByUserId('seller1');
      expect(updatedSellerWallet?.balance.toNumber()).toBeCloseTo(84.01, 2); // 100 - 15.99

      // Verify provider wallet was credited
      const updatedProviderWallet = await walletRepository.findByUserId(
        'provider1'
      );
      expect(updatedProviderWallet?.balance.toNumber()).toBeCloseTo(15.1905, 4);

      // Verify admin wallet received commission
      const updatedAdminWallet = await walletRepository.findByUserId('admin');
      expect(updatedAdminWallet?.balance.toNumber()).toBeCloseTo(0.7995, 4);

      // Verify product status changed to sold
      expect(result.product.status).toBe('sold');
    });

    it('should include product credentials in response', async () => {
      await walletRepository.createWallet('seller1', 100);
      await walletRepository.createWallet('provider1', 0);
      await walletRepository.createWallet('admin', 0);

      const product = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        sellerId: 'seller1',
        productId: product.id,
      });

      expect(result.product.accountEmail).toBe('account@netflix.com');
      expect(result.product.accountPassword).toBe('password123');
    });

    it('should throw error if product not found', async () => {
      await walletRepository.createWallet('seller1', 100);

      await expect(
        useCase.execute({
          sellerId: 'seller1',
          productId: 'nonexistent',
        })
      ).rejects.toThrow('Product not found');
    });

    it('should throw error if product is not available', async () => {
      await walletRepository.createWallet('seller1', 100);
      await walletRepository.createWallet('provider1', 0);
      await walletRepository.createWallet('admin', 0);

      const product = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
        status: ProductStatus.sold(),
      });

      await expect(
        useCase.execute({
          sellerId: 'seller1',
          productId: product.id,
        })
      ).rejects.toThrow('Product cannot be purchased');
    });

    it('should throw error if product already purchased', async () => {
      await walletRepository.createWallet('seller1', 100);
      await walletRepository.createWallet('seller2', 100);
      await walletRepository.createWallet('provider1', 0);
      await walletRepository.createWallet('admin', 0);

      const product = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });

      // First purchase
      await useCase.execute({
        sellerId: 'seller1',
        productId: product.id,
      });

      // Second purchase should fail (product status is now 'sold')
      await expect(
        useCase.execute({
          sellerId: 'seller2',
          productId: product.id,
        })
      ).rejects.toThrow('Product cannot be purchased');
    });

    it('should throw error if seller wallet not found', async () => {
      await walletRepository.createWallet('provider1', 0);
      await walletRepository.createWallet('admin', 0);

      const product = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });

      await expect(
        useCase.execute({
          sellerId: 'seller1', // No wallet created
          productId: product.id,
        })
      ).rejects.toThrow('Seller wallet not found');
    });

    it('should throw error if insufficient balance', async () => {
      await walletRepository.createWallet('seller1', 10); // Only $10
      await walletRepository.createWallet('provider1', 0);
      await walletRepository.createWallet('admin', 0);

      const product = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99, // Costs $15.99
      });

      await expect(
        useCase.execute({
          sellerId: 'seller1',
          productId: product.id,
        })
      ).rejects.toThrow('Insufficient balance');
    });

    it('should throw error if provider wallet not found', async () => {
      await walletRepository.createWallet('seller1', 100);
      await walletRepository.createWallet('admin', 0);
      // No provider wallet created

      const product = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });

      await expect(
        useCase.execute({
          sellerId: 'seller1',
          productId: product.id,
        })
      ).rejects.toThrow('Provider wallet not found');
    });

    it('should throw error if admin wallet not found', async () => {
      await walletRepository.createWallet('seller1', 100);
      await walletRepository.createWallet('provider1', 0);
      // No admin wallet created

      const product = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });

      await expect(
        useCase.execute({
          sellerId: 'seller1',
          productId: product.id,
        })
      ).rejects.toThrow('Admin wallet not found');
    });

    it('should handle multiple purchases by same seller', async () => {
      await walletRepository.createWallet('seller1', 200);
      await walletRepository.createWallet('provider1', 0);
      await walletRepository.createWallet('admin', 0);

      const product1 = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });

      const product2 = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'spotify',
        price: 12.99,
      });

      // Purchase product 1
      await useCase.execute({
        sellerId: 'seller1',
        productId: product1.id,
      });

      // Purchase product 2
      await useCase.execute({
        sellerId: 'seller1',
        productId: product2.id,
      });

      // Verify seller spent total amount (15.99 + 12.99 = 28.98)
      const sellerWallet = await walletRepository.findByUserId('seller1');
      expect(sellerWallet?.balance.toNumber()).toBeCloseTo(171.02, 2); // 200 - 28.98

      // Verify both purchases saved
      const purchases = await purchaseRepository.findBySellerId('seller1');
      expect(purchases.length).toBe(2);
    });

    it('should handle purchase with exact balance', async () => {
      await walletRepository.createWallet('seller1', 15.99); // Exact amount
      await walletRepository.createWallet('provider1', 0);
      await walletRepository.createWallet('admin', 0);

      const product = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        sellerId: 'seller1',
        productId: product.id,
      });

      expect(result.purchase.amount).toBe('15.9900');

      // Verify seller balance is now 0
      const sellerWallet = await walletRepository.findByUserId('seller1');
      expect(sellerWallet?.balance.toNumber()).toBe(0);
    });

    it('should return updated wallet balance', async () => {
      await walletRepository.createWallet('seller1', 100);
      await walletRepository.createWallet('provider1', 0);
      await walletRepository.createWallet('admin', 0);

      const product = await productRepository.createProduct({
        providerId: 'provider1',
        category: 'netflix',
        price: 15.99,
      });

      const result = await useCase.execute({
        sellerId: 'seller1',
        productId: product.id,
      });

      expect(parseFloat(result.walletBalance)).toBeCloseTo(84.01, 2);
    });
  });
});
