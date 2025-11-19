import { Purchase } from '../Purchase';
import { Money } from '../../value-objects/Money';

describe('Purchase Entity', () => {
  describe('create', () => {
    it('should create a new purchase with valid data', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05, // 5%
      });

      expect(purchase.id).toBeDefined();
      expect(purchase.sellerId).toBe('seller123');
      expect(purchase.productId).toBe('product456');
      expect(purchase.amount.toNumber()).toBe(15.99);
      expect(purchase.commissionRate).toBe(0.05);
    });

    it('should calculate admin commission correctly', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(100),
        commissionRate: 0.05, // 5%
      });

      expect(purchase.adminCommission.toNumber()).toBe(5.00);
    });

    it('should calculate provider earnings correctly', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(100),
        commissionRate: 0.05, // 5%
      });

      expect(purchase.providerEarnings.toNumber()).toBe(95.00);
    });

    it('should handle decimal commission rates', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05, // 5%
      });

      expect(purchase.adminCommission.toPlainString()).toBe('0.7995');
      expect(purchase.providerEarnings.toPlainString()).toBe('15.1905');
    });

    it('should set timestamp', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05,
      });

      expect(purchase.createdAt).toBeInstanceOf(Date);
    });

    it('should throw error if sellerId is empty', () => {
      expect(() =>
        Purchase.create({
          sellerId: '',
          productId: 'product456',
          amount: Money.create(15.99),
          commissionRate: 0.05,
        })
      ).toThrow('Seller ID is required');
    });

    it('should throw error if productId is empty', () => {
      expect(() =>
        Purchase.create({
          sellerId: 'seller123',
          productId: '',
          amount: Money.create(15.99),
          commissionRate: 0.05,
        })
      ).toThrow('Product ID is required');
    });

    it('should throw error if amount is not positive', () => {
      expect(() =>
        Purchase.create({
          sellerId: 'seller123',
          productId: 'product456',
          amount: Money.create(0),
          commissionRate: 0.05,
        })
      ).toThrow('Purchase amount must be positive');
    });

    it('should throw error if commissionRate is negative', () => {
      expect(() =>
        Purchase.create({
          sellerId: 'seller123',
          productId: 'product456',
          amount: Money.create(15.99),
          commissionRate: -0.05,
        })
      ).toThrow('Commission rate must be between 0 and 1');
    });

    it('should throw error if commissionRate is greater than 1', () => {
      expect(() =>
        Purchase.create({
          sellerId: 'seller123',
          productId: 'product456',
          amount: Money.create(15.99),
          commissionRate: 1.5,
        })
      ).toThrow('Commission rate must be between 0 and 1');
    });

    it('should allow zero commission rate', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0,
      });

      expect(purchase.adminCommission.isZero()).toBe(true);
      expect(purchase.providerEarnings.toNumber()).toBe(15.99);
    });

    it('should allow 100% commission rate', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 1, // 100%
      });

      expect(purchase.adminCommission.toNumber()).toBe(15.99);
      expect(purchase.providerEarnings.isZero()).toBe(true);
    });
  });

  describe('fromPersistence', () => {
    it('should reconstruct purchase from persistence data', () => {
      const amount = Money.create(15.99);
      const adminCommission = Money.create(0.7995);

      const purchase = Purchase.fromPersistence({
        id: 'purchase123',
        sellerId: 'seller123',
        productId: 'product456',
        amount,
        adminCommission,
        commissionRate: 0.05,
        createdAt: new Date('2024-01-01'),
      });

      expect(purchase.id).toBe('purchase123');
      expect(purchase.sellerId).toBe('seller123');
      expect(purchase.productId).toBe('product456');
      expect(purchase.amount.toNumber()).toBe(15.99);
      expect(purchase.commissionRate).toBe(0.05);
    });
  });

  describe('commissionPercentage', () => {
    it('should return percentage as string', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05,
      });

      expect(purchase.commissionPercentage).toBe('5.00%');
    });

    it('should handle decimal percentages', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.075,
      });

      expect(purchase.commissionPercentage).toBe('7.50%');
    });

    it('should format zero percentage', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0,
      });

      expect(purchase.commissionPercentage).toBe('0.00%');
    });
  });

  describe('isPurchasedBy', () => {
    it('should return true if userId matches sellerId', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05,
      });

      expect(purchase.isPurchasedBy('seller123')).toBe(true);
    });

    it('should return false if userId does not match', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05,
      });

      expect(purchase.isPurchasedBy('other_user')).toBe(false);
    });
  });

  describe('isForProduct', () => {
    it('should return true if productId matches', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05,
      });

      expect(purchase.isForProduct('product456')).toBe(true);
    });

    it('should return false if productId does not match', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05,
      });

      expect(purchase.isForProduct('other_product')).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize purchase for API response', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05,
      });

      const json = purchase.toJSON();

      expect(json.id).toBeDefined();
      expect(json.sellerId).toBe('seller123');
      expect(json.productId).toBe('product456');
      expect(json.amount).toBe('15.9900');
      expect(json.currency).toBe('USD');
      expect(json.adminCommission).toBe('0.7995');
      expect(json.providerEarnings).toBe('15.1905');
      expect(json.commissionRate).toBe(0.05);
      expect(json.commissionPercentage).toBe('5.00%');
      expect(json.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('toDetailedJSON', () => {
    it('should include breakdown in detailed response', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(100),
        commissionRate: 0.10, // 10%
      });

      const json = purchase.toDetailedJSON();

      expect(json.breakdown).toBeDefined();
      expect(json.breakdown.totalPaid).toBe('100.0000');
      expect(json.breakdown.adminCommission).toBe('10.0000');
      expect(json.breakdown.providerReceived).toBe('90.0000');
      expect(json.breakdown.commissionRate).toBe(0.10);
    });
  });

  describe('toPersistence', () => {
    it('should serialize for Prisma', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05,
      });

      const persistence = purchase.toPersistence();

      expect(persistence.id).toBeDefined();
      expect(persistence.sellerId).toBe('seller123');
      expect(persistence.productId).toBe('product456');
      expect(persistence.amount.toString()).toBe('15.99'); // Decimal
      expect(persistence.currency).toBe('USD');
      expect(persistence.adminCommission.toString()).toBe('0.7995'); // Decimal
      expect(persistence.commissionRate).toBe(0.05);
    });
  });

  describe('immutability', () => {
    it('should be frozen (immutable)', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05,
      });

      expect(Object.isFrozen(purchase)).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should calculate correct money flow for typical purchase', () => {
      // Seller compra producto de $15.99 con 5% comisión
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(15.99),
        commissionRate: 0.05,
      });

      // Seller paga: $15.99
      expect(purchase.amount.toPlainString()).toBe('15.9900');

      // Admin recibe: $0.7995 (5% de 15.99)
      expect(purchase.adminCommission.toPlainString()).toBe('0.7995');

      // Provider recibe: $15.1905 (15.99 - 0.7995)
      expect(purchase.providerEarnings.toPlainString()).toBe('15.1905');
    });

    it('should handle high-value purchase', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(999.99),
        commissionRate: 0.03, // 3%
      });

      expect(purchase.adminCommission.toPlainString()).toBe('29.9997');
      expect(purchase.providerEarnings.toPlainString()).toBe('969.9903');
    });

    it('should handle low commission rate', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(50),
        commissionRate: 0.01, // 1%
      });

      expect(purchase.adminCommission.toNumber()).toBe(0.50);
      expect(purchase.providerEarnings.toNumber()).toBe(49.50);
    });

    it('should handle high commission rate', () => {
      const purchase = Purchase.create({
        sellerId: 'seller123',
        productId: 'product456',
        amount: Money.create(50),
        commissionRate: 0.20, // 20%
      });

      expect(purchase.adminCommission.toNumber()).toBe(10.00);
      expect(purchase.providerEarnings.toNumber()).toBe(40.00);
    });
  });
});
