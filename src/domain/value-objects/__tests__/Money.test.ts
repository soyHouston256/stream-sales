import { Decimal } from '@prisma/client/runtime/library';
import { Money } from '../Money';

describe('Money Value Object', () => {
  describe('create', () => {
    it('should create Money from number', () => {
      const money = Money.create(100.50, 'USD');

      expect(money.currency).toBe('USD');
      expect(money.toNumber()).toBe(100.50);
    });

    it('should create Money from string', () => {
      const money = Money.create('250.75', 'EUR');

      expect(money.currency).toBe('EUR');
      expect(money.toNumber()).toBe(250.75);
    });

    it('should create Money from Decimal', () => {
      const decimal = new Decimal('99.9999');
      const money = Money.create(decimal, 'USD');

      expect(money.currency).toBe('USD');
      expect(money.toPlainString()).toBe('99.9999');
    });

    it('should default to USD currency', () => {
      const money = Money.create(50);

      expect(money.currency).toBe('USD');
    });

    it('should normalize currency to uppercase', () => {
      const money = Money.create(100, 'usd');

      expect(money.currency).toBe('USD');
    });

    it('should round to 4 decimal places', () => {
      const money = Money.create(10.123456);

      expect(money.toPlainString()).toBe('10.1235'); // Redondeado
    });

    it('should throw error for invalid currency', () => {
      expect(() => Money.create(100, 'INVALID')).toThrow('Invalid currency');
    });

    it('should throw error for invalid amount string', () => {
      expect(() => Money.create('not-a-number')).toThrow('Invalid amount');
    });

    it('should throw error for NaN', () => {
      expect(() => Money.create(NaN)).toThrow('Invalid amount');
    });

    it('should throw error for Infinity', () => {
      expect(() => Money.create(Infinity)).toThrow('Invalid amount');
    });

    it('should accept negative amounts (validation in domain layer)', () => {
      const money = Money.create(-50.00);

      expect(money.toNumber()).toBe(-50.00);
      expect(money.isNegative()).toBe(true);
    });

    it('should accept zero', () => {
      const money = Money.create(0);

      expect(money.isZero()).toBe(true);
    });
  });

  describe('fromPersistence', () => {
    it('should create Money from Prisma Decimal', () => {
      const decimal = new Decimal('1500.5000');
      const money = Money.fromPersistence(decimal, 'USD');

      expect(money.currency).toBe('USD');
      expect(money.amount).toEqual(decimal);
    });
  });

  describe('add', () => {
    it('should add two Money values with same currency', () => {
      const money1 = Money.create(100.50);
      const money2 = Money.create(50.25);

      const result = money1.add(money2);

      expect(result.toNumber()).toBe(150.75);
      expect(result.currency).toBe('USD');
    });

    it('should handle addition with zero', () => {
      const money = Money.create(100);
      const zero = Money.create(0);

      const result = money.add(zero);

      expect(result.toNumber()).toBe(100);
    });

    it('should throw error when adding different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(50, 'EUR');

      expect(() => usd.add(eur)).toThrow('Currency mismatch');
    });

    it('should maintain precision with 4 decimals', () => {
      const money1 = Money.create(10.1234);
      const money2 = Money.create(5.4321);

      const result = money1.add(money2);

      expect(result.toPlainString()).toBe('15.5555');
    });
  });

  describe('subtract', () => {
    it('should subtract two Money values with same currency', () => {
      const money1 = Money.create(100.50);
      const money2 = Money.create(30.25);

      const result = money1.subtract(money2);

      expect(result.toNumber()).toBe(70.25);
    });

    it('should allow negative result (validation in domain)', () => {
      const money1 = Money.create(50);
      const money2 = Money.create(100);

      const result = money1.subtract(money2);

      expect(result.toNumber()).toBe(-50);
      expect(result.isNegative()).toBe(true);
    });

    it('should throw error when subtracting different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(50, 'EUR');

      expect(() => usd.subtract(eur)).toThrow('Currency mismatch');
    });
  });

  describe('multiply', () => {
    it('should multiply by a number', () => {
      const money = Money.create(100);

      const result = money.multiply(2);

      expect(result.toNumber()).toBe(200);
    });

    it('should multiply by a decimal for commission calculation', () => {
      const amount = Money.create(100);
      const commission = amount.multiply(0.05); // 5% commission

      expect(commission.toNumber()).toBe(5);
    });

    it('should multiply by string', () => {
      const money = Money.create(50);

      const result = money.multiply('3');

      expect(result.toNumber()).toBe(150);
    });

    it('should multiply by Decimal', () => {
      const money = Money.create(200);
      const factor = new Decimal('0.15'); // 15%

      const result = money.multiply(factor);

      expect(result.toNumber()).toBe(30);
    });

    it('should handle multiplication by zero', () => {
      const money = Money.create(100);

      const result = money.multiply(0);

      expect(result.isZero()).toBe(true);
    });

    it('should maintain precision after multiplication', () => {
      const money = Money.create(10.5555);

      const result = money.multiply(2);

      expect(result.toPlainString()).toBe('21.1110');
    });
  });

  describe('divide', () => {
    it('should divide by a number', () => {
      const money = Money.create(100);

      const result = money.divide(2);

      expect(result.toNumber()).toBe(50);
    });

    it('should divide by string', () => {
      const money = Money.create(150);

      const result = money.divide('3');

      expect(result.toNumber()).toBe(50);
    });

    it('should throw error when dividing by zero', () => {
      const money = Money.create(100);

      expect(() => money.divide(0)).toThrow('Cannot divide by zero');
    });

    it('should maintain precision with 4 decimals', () => {
      const money = Money.create(10);

      const result = money.divide(3);

      expect(result.toPlainString()).toBe('3.3333');
    });
  });

  describe('equals', () => {
    it('should return true for equal Money values', () => {
      const money1 = Money.create(100.50, 'USD');
      const money2 = Money.create(100.50, 'USD');

      expect(money1.equals(money2)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const money1 = Money.create(100);
      const money2 = Money.create(50);

      expect(money1.equals(money2)).toBe(false);
    });

    it('should return false for different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(100, 'EUR');

      expect(usd.equals(eur)).toBe(false);
    });
  });

  describe('isGreaterThan', () => {
    it('should return true when amount is greater', () => {
      const money1 = Money.create(100);
      const money2 = Money.create(50);

      expect(money1.isGreaterThan(money2)).toBe(true);
    });

    it('should return false when amount is less', () => {
      const money1 = Money.create(50);
      const money2 = Money.create(100);

      expect(money1.isGreaterThan(money2)).toBe(false);
    });

    it('should return false when amounts are equal', () => {
      const money1 = Money.create(100);
      const money2 = Money.create(100);

      expect(money1.isGreaterThan(money2)).toBe(false);
    });

    it('should throw error for different currencies', () => {
      const usd = Money.create(100, 'USD');
      const eur = Money.create(50, 'EUR');

      expect(() => usd.isGreaterThan(eur)).toThrow('Currency mismatch');
    });
  });

  describe('isLessThan', () => {
    it('should return true when amount is less', () => {
      const money1 = Money.create(50);
      const money2 = Money.create(100);

      expect(money1.isLessThan(money2)).toBe(true);
    });

    it('should return false when amount is greater', () => {
      const money1 = Money.create(100);
      const money2 = Money.create(50);

      expect(money1.isLessThan(money2)).toBe(false);
    });
  });

  describe('isGreaterThanOrEqual', () => {
    it('should return true when amount is greater', () => {
      const money1 = Money.create(100);
      const money2 = Money.create(50);

      expect(money1.isGreaterThanOrEqual(money2)).toBe(true);
    });

    it('should return true when amounts are equal', () => {
      const money1 = Money.create(100);
      const money2 = Money.create(100);

      expect(money1.isGreaterThanOrEqual(money2)).toBe(true);
    });

    it('should return false when amount is less', () => {
      const money1 = Money.create(50);
      const money2 = Money.create(100);

      expect(money1.isGreaterThanOrEqual(money2)).toBe(false);
    });
  });

  describe('isZero', () => {
    it('should return true for zero amount', () => {
      const money = Money.create(0);

      expect(money.isZero()).toBe(true);
    });

    it('should return false for non-zero amount', () => {
      const money = Money.create(0.01);

      expect(money.isZero()).toBe(false);
    });
  });

  describe('isPositive', () => {
    it('should return true for positive amount', () => {
      const money = Money.create(100);

      expect(money.isPositive()).toBe(true);
    });

    it('should return false for zero', () => {
      const money = Money.create(0);

      expect(money.isPositive()).toBe(false);
    });

    it('should return false for negative amount', () => {
      const money = Money.create(-50);

      expect(money.isPositive()).toBe(false);
    });
  });

  describe('isNegative', () => {
    it('should return true for negative amount', () => {
      const money = Money.create(-100);

      expect(money.isNegative()).toBe(true);
    });

    it('should return false for zero', () => {
      const money = Money.create(0);

      expect(money.isNegative()).toBe(false);
    });

    it('should return false for positive amount', () => {
      const money = Money.create(50);

      expect(money.isNegative()).toBe(false);
    });
  });

  describe('abs', () => {
    it('should return absolute value of negative amount', () => {
      const money = Money.create(-100);

      const result = money.abs();

      expect(result.toNumber()).toBe(100);
      expect(result.isPositive()).toBe(true);
    });

    it('should return same value for positive amount', () => {
      const money = Money.create(100);

      const result = money.abs();

      expect(result.toNumber()).toBe(100);
    });
  });

  describe('toString', () => {
    it('should format USD with symbol and commas', () => {
      const money = Money.create(1234.56, 'USD');

      expect(money.toString()).toBe('$1,234.56');
    });

    it('should format large amounts with commas', () => {
      const money = Money.create(1000000.99);

      expect(money.toString()).toBe('$1,000,000.99');
    });

    it('should format EUR with euro symbol', () => {
      const money = Money.create(500.50, 'EUR');

      expect(money.toString()).toBe('€500.50');
    });

    it('should always show 2 decimal places in formatted output', () => {
      const money = Money.create(100);

      expect(money.toString()).toBe('$100.00');
    });
  });

  describe('toPlainString', () => {
    it('should return amount with 4 decimal places', () => {
      const money = Money.create(100.5);

      expect(money.toPlainString()).toBe('100.5000');
    });

    it('should preserve precision', () => {
      const money = Money.create(99.9999);

      expect(money.toPlainString()).toBe('99.9999');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON with amount and currency', () => {
      const money = Money.create(150.75, 'USD');

      const json = money.toJSON();

      expect(json).toEqual({
        amount: '150.7500',
        currency: 'USD',
      });
    });
  });

  describe('immutability', () => {
    it('should not mutate original Money when adding', () => {
      const original = Money.create(100);
      const toAdd = Money.create(50);

      original.add(toAdd);

      expect(original.toNumber()).toBe(100); // No mutado
    });

    it('should not mutate original Money when subtracting', () => {
      const original = Money.create(100);
      const toSubtract = Money.create(30);

      original.subtract(toSubtract);

      expect(original.toNumber()).toBe(100);
    });

    it('should not mutate original Money when multiplying', () => {
      const original = Money.create(100);

      original.multiply(2);

      expect(original.toNumber()).toBe(100);
    });

    it('should be frozen (immutable)', () => {
      const money = Money.create(100);

      expect(Object.isFrozen(money)).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should calculate provider earnings correctly', () => {
      // Producto de $15.99, comisión admin 5%
      const productPrice = Money.create(15.99);
      const commissionRate = new Decimal('0.05');

      const adminCommission = productPrice.multiply(commissionRate);
      const providerEarnings = productPrice.subtract(adminCommission);

      expect(adminCommission.toPlainString()).toBe('0.7995'); // 5% de 15.99 = 0.7995 (precisión exacta)
      expect(providerEarnings.toPlainString()).toBe('15.1905'); // 15.99 - 0.7995 = 15.1905
    });

    it('should calculate affiliate commission correctly', () => {
      // Usuario registra, paga $50, afiliado recibe 10%
      const registrationFee = Money.create(50);
      const affiliateRate = new Decimal('0.10');

      const affiliateCommission = registrationFee.multiply(affiliateRate);

      expect(affiliateCommission.toNumber()).toBe(5.00);
    });

    it('should handle wallet balance operations', () => {
      // Saldo inicial $100, recarga $50, compra $30
      let balance = Money.create(100);

      balance = balance.add(Money.create(50)); // Recarga
      expect(balance.toNumber()).toBe(150);

      balance = balance.subtract(Money.create(30)); // Compra
      expect(balance.toNumber()).toBe(120);
    });

    it('should validate sufficient balance', () => {
      const balance = Money.create(50);
      const purchaseAmount = Money.create(100);

      const hasSufficientBalance = balance.isGreaterThanOrEqual(purchaseAmount);

      expect(hasSufficientBalance).toBe(false);
    });

    it('should handle multi-currency wallet (prevent mixing)', () => {
      const usdBalance = Money.create(100, 'USD');
      const eurDeposit = Money.create(50, 'EUR');

      expect(() => usdBalance.add(eurDeposit)).toThrow('Currency mismatch');
    });
  });
});
