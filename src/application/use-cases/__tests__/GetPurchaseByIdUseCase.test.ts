import { GetPurchaseByIdUseCase } from '../GetPurchaseByIdUseCase';
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

describe('GetPurchaseByIdUseCase', () => {
  let useCase: GetPurchaseByIdUseCase;
  let repository: MockPurchaseRepository;

  beforeEach(() => {
    repository = new MockPurchaseRepository();
    useCase = new GetPurchaseByIdUseCase(repository);
  });

  describe('execute', () => {
    it('should get purchase by id for owner', async () => {
      const purchase = await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product456',
        price: 15.99,
        commissionRate: 0.05,
      });

      const result = await useCase.execute({
        purchaseId: purchase.id,
        requestUserId: 'seller123', // Owner
      });

      expect(result.purchase.id).toBe(purchase.id);
      expect(result.purchase.sellerId).toBe('seller123');
      expect(result.purchase.productId).toBe('product456');
      expect(result.purchase.amount).toBe('15.9900');
    });

    it('should include detailed breakdown', async () => {
      const purchase = await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product456',
        price: 100,
        commissionRate: 0.10, // 10%
      });

      const result = await useCase.execute({
        purchaseId: purchase.id,
        requestUserId: 'seller123',
      });

      expect(result.purchase.breakdown).toBeDefined();
      expect(result.purchase.breakdown.totalPaid).toBe('100.0000');
      expect(result.purchase.breakdown.adminCommission).toBe('10.0000');
      expect(result.purchase.breakdown.providerReceived).toBe('90.0000');
      expect(result.purchase.breakdown.commissionRate).toBe(0.10);
    });

    it('should allow admin to view any purchase', async () => {
      const purchase = await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product456',
        price: 15.99,
        commissionRate: 0.05,
      });

      const result = await useCase.execute({
        purchaseId: purchase.id,
        requestUserId: 'admin', // Admin user
      });

      expect(result.purchase.id).toBe(purchase.id);
    });

    it('should throw error if purchase not found', async () => {
      await expect(
        useCase.execute({
          purchaseId: 'nonexistent',
          requestUserId: 'seller123',
        })
      ).rejects.toThrow('Purchase not found');
    });

    it('should throw error if user is not owner or admin', async () => {
      const purchase = await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product456',
        price: 15.99,
        commissionRate: 0.05,
      });

      await expect(
        useCase.execute({
          purchaseId: purchase.id,
          requestUserId: 'other_user', // Not the owner or admin
        })
      ).rejects.toThrow('Unauthorized');
    });

    it('should include commission percentage', async () => {
      const purchase = await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product456',
        price: 15.99,
        commissionRate: 0.075, // 7.5%
      });

      const result = await useCase.execute({
        purchaseId: purchase.id,
        requestUserId: 'seller123',
      });

      expect(result.purchase.commissionPercentage).toBe('7.50%');
    });

    it('should include all financial details', async () => {
      const purchase = await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product456',
        price: 50,
        commissionRate: 0.05, // 5%
      });

      const result = await useCase.execute({
        purchaseId: purchase.id,
        requestUserId: 'seller123',
      });

      expect(result.purchase.amount).toBe('50.0000');
      expect(result.purchase.adminCommission).toBe('2.5000');
      expect(result.purchase.providerEarnings).toBe('47.5000');
      expect(result.purchase.commissionRate).toBe(0.05);
    });

    it('should include timestamp', async () => {
      const purchase = await repository.createPurchase({
        sellerId: 'seller123',
        productId: 'product456',
        price: 15.99,
        commissionRate: 0.05,
      });

      const result = await useCase.execute({
        purchaseId: purchase.id,
        requestUserId: 'seller123',
      });

      expect(result.purchase.createdAt).toBeInstanceOf(Date);
    });
  });
});
