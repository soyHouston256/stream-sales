import { ListMyPurchasesUseCase } from '../ListMyPurchasesUseCase';
import { Purchase } from '../../../domain/entities/Purchase';
import { Money } from '../../../domain/value-objects/Money';
import { IPurchaseRepository } from '../../../domain/repositories/IPurchaseRepository';

// Mock Repository
class MockPurchaseRepository implements IPurchaseRepository {
  private purchases: Map<string, Purchase> = new Map();

  async save(purchase: Purchase): Promise<Purchase> {
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
    filters?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Purchase[]> {
    let results = Array.from(this.purchases.values()).filter(
      (p) => p.sellerId === sellerId
    );

    // Apply date filters
    if (filters?.startDate) {
      results = results.filter(
        (p) => p.createdAt >= filters.startDate!
      );
    }
    if (filters?.endDate) {
      results = results.filter(
        (p) => p.createdAt <= filters.endDate!
      );
    }

    // Sort by date descending (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const start = filters?.offset || 0;
    const end = filters?.limit ? start + filters.limit : results.length;

    return results.slice(start, end);
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

  async markAsRefunded(purchaseId: string): Promise<void> {
    const purchase = await this.findById(purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }
    // In a real implementation, this would update the purchase status
    // For mock purposes, we just verify it exists
  }

  // Helper for tests
  async createPurchase(data: {
    sellerId: string;
    productId: string;
    price: number;
    commissionRate: number;
  }): Promise<Purchase> {
    const purchase = Purchase.create({
      sellerId: data.sellerId,
      productId: data.productId,
      providerId: 'provider789',
      amount: Money.create(data.price),
      commissionRate: data.commissionRate,
    });

    return this.save(purchase);
  }
}

describe('ListMyPurchasesUseCase', () => {
  let useCase: ListMyPurchasesUseCase;
  let repository: MockPurchaseRepository;

  beforeEach(() => {
    repository = new MockPurchaseRepository();
    useCase = new ListMyPurchasesUseCase(repository);
  });

  describe('execute', () => {
    it('should list all purchases for a seller', async () => {
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product1',
        price: 15.99,
        commissionRate: 0.05,
      });
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product2',
        price: 12.99,
        commissionRate: 0.05,
      });

      const result = await useCase.execute({
        sellerId: 'seller123',
      });

      expect(result.purchases.length).toBe(2);
      expect(result.pagination.total).toBe(2);
      expect(result.summary.totalPurchases).toBe(2);
    });

    it('should calculate total spent correctly', async () => {
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product1',
        price: 15.99,
        commissionRate: 0.05,
      });
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product2',
        price: 12.99,
        commissionRate: 0.05,
      });

      const result = await useCase.execute({
        sellerId: 'seller123',
      });

      expect(result.summary.totalSpent).toBeCloseTo(28.98, 2); // 15.99 + 12.99
    });

    it('should apply pagination with limit', async () => {
      // Create 5 purchases
      for (let i = 1; i <= 5; i++) {
        await repository.createPurchase({
          sellerId: 'seller123',
          productId: `product${i}`,
          price: 10 + i,
          commissionRate: 0.05,
        });
      }

      const result = await useCase.execute({
        sellerId: 'seller123',
        limit: 3,
      });

      expect(result.purchases.length).toBe(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should apply pagination with offset', async () => {
      // Create 5 purchases
      for (let i = 1; i <= 5; i++) {
        await repository.createPurchase({
          sellerId: 'seller123',
          productId: `product${i}`,
          price: 10 + i,
          commissionRate: 0.05,
        });
      }

      const result = await useCase.execute({
        sellerId: 'seller123',
        limit: 2,
        offset: 2,
      });

      expect(result.purchases.length).toBe(2);
      expect(result.pagination.offset).toBe(2);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should return hasMore false when no more pages', async () => {
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product1',
        price: 15.99,
        commissionRate: 0.05,
      });
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product2',
        price: 12.99,
        commissionRate: 0.05,
      });

      const result = await useCase.execute({
        sellerId: 'seller123',
        limit: 10,
      });

      expect(result.pagination.hasMore).toBe(false);
    });

    it('should use default limit of 20', async () => {
      // Create 25 purchases
      for (let i = 1; i <= 25; i++) {
        await repository.createPurchase({
          sellerId: 'seller123',
          productId: `product${i}`,
          price: 10,
          commissionRate: 0.05,
        });
      }

      const result = await useCase.execute({
        sellerId: 'seller123',
      });

      expect(result.purchases.length).toBe(20); // Default limit
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should return empty array when seller has no purchases', async () => {
      const result = await useCase.execute({
        sellerId: 'seller123',
      });

      expect(result.purchases.length).toBe(0);
      expect(result.pagination.total).toBe(0);
      expect(result.summary.totalSpent).toBe(0);
      expect(result.summary.totalPurchases).toBe(0);
    });

    it('should only return purchases for specified seller', async () => {
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product1',
        price: 15.99,
        commissionRate: 0.05,
      });
      await repository.createPurchase({
        sellerId: 'seller456', // Different seller
        productId: 'product2',
        price: 12.99,
        commissionRate: 0.05,
      });

      const result = await useCase.execute({
        sellerId: 'seller123',
      });

      expect(result.purchases.length).toBe(1);
      expect(result.purchases[0].sellerId).toBe('seller123');
    });

    it('should include all financial details in response', async () => {
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product1',
        price: 100,
        commissionRate: 0.10, // 10%
      });

      const result = await useCase.execute({
        sellerId: 'seller123',
      });

      const purchase = result.purchases[0];
      expect(purchase.amount).toBe('100.0000');
      expect(purchase.adminCommission).toBe('10.0000');
      expect(purchase.providerEarnings).toBe('90.0000');
      expect(purchase.commissionRate).toBe(0.10);
      expect(purchase.commissionPercentage).toBe('10.00%');
    });

    it('should include pagination metadata', async () => {
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product1',
        price: 15.99,
        commissionRate: 0.05,
      });

      const result = await useCase.execute({
        sellerId: 'seller123',
        limit: 10,
        offset: 0,
      });

      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should include summary statistics', async () => {
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product1',
        price: 15.99,
        commissionRate: 0.05,
      });
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product2',
        price: 20.00,
        commissionRate: 0.05,
      });

      const result = await useCase.execute({
        sellerId: 'seller123',
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.totalPurchases).toBe(2);
      expect(result.summary.totalSpent).toBeCloseTo(35.99, 2);
    });

    it('should handle large offset correctly', async () => {
      await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product1',
        price: 15.99,
        commissionRate: 0.05,
      });

      const result = await useCase.execute({
        sellerId: 'seller123',
        limit: 10,
        offset: 100, // Offset beyond total
      });

      expect(result.purchases.length).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });
  });
});
