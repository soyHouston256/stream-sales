import { Wallet, WalletStatus } from '../Wallet';
import { Money } from '../../value-objects/Money';
import { InsufficientBalanceException } from '../../exceptions/InsufficientBalanceException';

describe('Wallet Entity', () => {
  describe('create', () => {
    it('should create a new wallet with zero balance', () => {
      const wallet = Wallet.create({ userId: 'user123' });

      expect(wallet.userId).toBe('user123');
      expect(wallet.balance.isZero()).toBe(true);
      expect(wallet.status).toBe(WalletStatus.ACTIVE);
      expect(wallet.balance.currency).toBe('USD');
    });

    it('should create wallet with custom currency', () => {
      const wallet = Wallet.create({ userId: 'user123', currency: 'EUR' });

      expect(wallet.balance.currency).toBe('EUR');
    });

    it('should generate unique ID', () => {
      const wallet1 = Wallet.create({ userId: 'user1' });
      const wallet2 = Wallet.create({ userId: 'user2' });

      expect(wallet1.id).not.toBe(wallet2.id);
    });

    it('should set timestamps', () => {
      const wallet = Wallet.create({ userId: 'user123' });

      expect(wallet.createdAt).toBeInstanceOf(Date);
      expect(wallet.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('fromPersistence', () => {
    it('should reconstruct wallet from persistence data', () => {
      const balance = Money.create(100, 'USD');
      const wallet = Wallet.fromPersistence({
        id: 'wallet123',
        userId: 'user123',
        balance,
        status: WalletStatus.ACTIVE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      });

      expect(wallet.id).toBe('wallet123');
      expect(wallet.userId).toBe('user123');
      expect(wallet.balance.toNumber()).toBe(100);
      expect(wallet.status).toBe(WalletStatus.ACTIVE);
    });
  });

  describe('credit', () => {
    it('should increase balance when crediting', () => {
      const wallet = Wallet.create({ userId: 'user123' });

      wallet.credit(Money.create(100));

      expect(wallet.balance.toNumber()).toBe(100);
    });

    it('should accumulate multiple credits', () => {
      const wallet = Wallet.create({ userId: 'user123' });

      wallet.credit(Money.create(50));
      wallet.credit(Money.create(30));
      wallet.credit(Money.create(20));

      expect(wallet.balance.toNumber()).toBe(100);
    });

    it('should update timestamp after credit', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      const originalTimestamp = wallet.updatedAt;

      // Pequeño delay para asegurar timestamp diferente
      setTimeout(() => {
        wallet.credit(Money.create(50));
        expect(wallet.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
      }, 10);
    });

    it('should throw error when crediting to frozen wallet', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.freeze();

      expect(() => wallet.credit(Money.create(100))).toThrow('Wallet is frozen');
    });

    it('should throw error when crediting to closed wallet', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.close();

      expect(() => wallet.credit(Money.create(100))).toThrow('Wallet is closed');
    });

    it('should throw error when crediting different currency', () => {
      const wallet = Wallet.create({ userId: 'user123', currency: 'USD' });

      expect(() => wallet.credit(Money.create(100, 'EUR'))).toThrow('Currency mismatch');
    });
  });

  describe('debit', () => {
    it('should decrease balance when debiting', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(100));

      wallet.debit(Money.create(30));

      expect(wallet.balance.toNumber()).toBe(70);
    });

    it('should handle multiple debits', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(100));

      wallet.debit(Money.create(20));
      wallet.debit(Money.create(30));

      expect(wallet.balance.toNumber()).toBe(50);
    });

    it('should throw InsufficientBalanceException when balance < amount', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(50));

      expect(() => wallet.debit(Money.create(100))).toThrow(InsufficientBalanceException);
    });

    it('should throw error when debiting from frozen wallet', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(100));
      wallet.freeze();

      expect(() => wallet.debit(Money.create(50))).toThrow('Wallet is frozen');
    });

    it('should throw error when debiting different currency', () => {
      const wallet = Wallet.create({ userId: 'user123', currency: 'USD' });
      wallet.credit(Money.create(100));

      expect(() => wallet.debit(Money.create(50, 'EUR'))).toThrow('Currency mismatch');
    });

    it('should allow debiting exact balance (balance = 0)', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(100));

      wallet.debit(Money.create(100));

      expect(wallet.balance.isZero()).toBe(true);
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return true when balance >= amount', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(100));

      expect(wallet.hasSufficientBalance(Money.create(50))).toBe(true);
      expect(wallet.hasSufficientBalance(Money.create(100))).toBe(true);
    });

    it('should return false when balance < amount', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(50));

      expect(wallet.hasSufficientBalance(Money.create(100))).toBe(false);
    });

    it('should throw error for different currency', () => {
      const wallet = Wallet.create({ userId: 'user123', currency: 'USD' });
      wallet.credit(Money.create(100));

      expect(() => wallet.hasSufficientBalance(Money.create(50, 'EUR'))).toThrow('Currency mismatch');
    });
  });

  describe('freeze', () => {
    it('should freeze an active wallet', () => {
      const wallet = Wallet.create({ userId: 'user123' });

      wallet.freeze();

      expect(wallet.status).toBe(WalletStatus.FROZEN);
      expect(wallet.isFrozen()).toBe(true);
    });

    it('should throw error when freezing closed wallet', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.close();

      expect(() => wallet.freeze()).toThrow('Cannot freeze a closed wallet');
    });

    it('should update timestamp after freezing', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      const originalTimestamp = wallet.updatedAt;

      setTimeout(() => {
        wallet.freeze();
        expect(wallet.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
      }, 10);
    });
  });

  describe('activate', () => {
    it('should activate a frozen wallet', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.freeze();

      wallet.activate();

      expect(wallet.status).toBe(WalletStatus.ACTIVE);
      expect(wallet.isActive()).toBe(true);
    });

    it('should throw error when activating closed wallet', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.close();

      expect(() => wallet.activate()).toThrow('Cannot activate a closed wallet');
    });
  });

  describe('close', () => {
    it('should close wallet with zero balance', () => {
      const wallet = Wallet.create({ userId: 'user123' });

      wallet.close();

      expect(wallet.status).toBe(WalletStatus.CLOSED);
      expect(wallet.isClosed()).toBe(true);
    });

    it('should throw error when closing wallet with non-zero balance', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(50));

      expect(() => wallet.close()).toThrow('Cannot close wallet with non-zero balance');
    });

    it('should allow closing after withdrawing all funds', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(100));
      wallet.debit(Money.create(100)); // Retirar todo

      wallet.close();

      expect(wallet.isClosed()).toBe(true);
    });
  });

  describe('status checks', () => {
    it('should correctly identify active wallet', () => {
      const wallet = Wallet.create({ userId: 'user123' });

      expect(wallet.isActive()).toBe(true);
      expect(wallet.isFrozen()).toBe(false);
      expect(wallet.isClosed()).toBe(false);
    });

    it('should correctly identify frozen wallet', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.freeze();

      expect(wallet.isActive()).toBe(false);
      expect(wallet.isFrozen()).toBe(true);
      expect(wallet.isClosed()).toBe(false);
    });

    it('should correctly identify closed wallet', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.close();

      expect(wallet.isActive()).toBe(false);
      expect(wallet.isFrozen()).toBe(false);
      expect(wallet.isClosed()).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize wallet for API response', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(150.75));

      const json = wallet.toJSON();

      expect(json).toMatchObject({
        userId: 'user123',
        balance: '150.7500',
        currency: 'USD',
        status: 'active',
      });
      expect(json.id).toBeDefined();
      expect(json.createdAt).toBeInstanceOf(Date);
      expect(json.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toPersistence', () => {
    it('should serialize wallet for Prisma', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(100.50));

      const persistence = wallet.toPersistence();

      expect(persistence.userId).toBe('user123');
      expect(persistence.balance.toString()).toBe('100.5'); // Decimal
      expect(persistence.currency).toBe('USD');
      expect(persistence.status).toBe('active');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle complete purchase flow', () => {
      // Seller compra producto de $15.99
      const sellerWallet = Wallet.create({ userId: 'seller123' });
      sellerWallet.credit(Money.create(100)); // Recarga inicial

      // Comprar producto
      const productPrice = Money.create(15.99);
      expect(sellerWallet.hasSufficientBalance(productPrice)).toBe(true);

      sellerWallet.debit(productPrice);
      expect(sellerWallet.balance.toNumber()).toBe(84.01);
    });

    it('should handle provider earnings flow', () => {
      // Provider vende producto, recibe earnings después de comisión
      const providerWallet = Wallet.create({ userId: 'provider123' });

      const productPrice = Money.create(15.99);
      const adminCommission = productPrice.multiply(0.05); // 5%
      const providerEarnings = productPrice.subtract(adminCommission);

      providerWallet.credit(providerEarnings);

      expect(providerWallet.balance.toPlainString()).toBe('15.1905');
    });

    it('should handle P2P transfer', () => {
      const walletA = Wallet.create({ userId: 'userA' });
      const walletB = Wallet.create({ userId: 'userB' });

      walletA.credit(Money.create(100));

      const transferAmount = Money.create(25.50);

      // Transfer: A -> B
      walletA.debit(transferAmount);
      walletB.credit(transferAmount);

      expect(walletA.balance.toNumber()).toBe(74.50);
      expect(walletB.balance.toNumber()).toBe(25.50);
    });

    it('should prevent overspending', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(50));

      // Intento de compra mayor al saldo
      expect(() => wallet.debit(Money.create(100))).toThrow(InsufficientBalanceException);

      // Saldo no cambia después del error
      expect(wallet.balance.toNumber()).toBe(50);
    });

    it('should handle wallet suspension workflow', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(100));

      // Usuario reportado -> freeze wallet
      wallet.freeze();

      // No puede realizar operaciones
      expect(() => wallet.debit(Money.create(10))).toThrow('Wallet is frozen');
      expect(() => wallet.credit(Money.create(50))).toThrow('Wallet is frozen');

      // Después de investigación -> reactivar
      wallet.activate();

      // Ahora puede operar nuevamente
      wallet.debit(Money.create(20));
      expect(wallet.balance.toNumber()).toBe(80);
    });

    it('should handle account closure workflow', () => {
      const wallet = Wallet.create({ userId: 'user123' });
      wallet.credit(Money.create(150));

      // Intentar cerrar con saldo -> error
      expect(() => wallet.close()).toThrow('Cannot close wallet with non-zero balance');

      // Retirar todo el saldo
      wallet.debit(Money.create(150));

      // Ahora puede cerrar
      wallet.close();
      expect(wallet.isClosed()).toBe(true);

      // No puede reactivar
      expect(() => wallet.activate()).toThrow('Cannot activate a closed wallet');
    });
  });
});
