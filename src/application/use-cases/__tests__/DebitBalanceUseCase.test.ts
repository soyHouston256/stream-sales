import { DebitBalanceUseCase } from '../DebitBalanceUseCase';
import { Wallet } from '../../../domain/entities/Wallet';
import { Money } from '../../../domain/value-objects/Money';
import { InsufficientBalanceException } from '../../../domain/exceptions/InsufficientBalanceException';
import { IWalletRepository } from '../../../domain/repositories/IWalletRepository';

// Mock del repository (mismo que CreditBalanceUseCase)
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

  async createWallet(userId: string, initialBalance: number = 0): Promise<Wallet> {
    const wallet = Wallet.create({ userId });
    if (initialBalance > 0) {
      wallet.credit(Money.create(initialBalance));
    }
    return this.save(wallet);
  }
}

describe('DebitBalanceUseCase', () => {
  let useCase: DebitBalanceUseCase;
  let repository: MockWalletRepository;

  beforeEach(() => {
    repository = new MockWalletRepository();
    useCase = new DebitBalanceUseCase(repository);
  });

  describe('execute', () => {
    it('should debit amount from wallet', async () => {
      await repository.createWallet('user123', 150);

      const result = await useCase.execute({
        userId: 'user123',
        amount: 50,
      });

      expect(result.wallet.balance).toBe('100.0000');
    });

    it('should return transaction details', async () => {
      await repository.createWallet('user123', 150);

      const result = await useCase.execute({
        userId: 'user123',
        amount: 50,
      });

      expect(result.transaction.previousBalance).toBe('150.0000');
      expect(result.transaction.amountDebited).toBe('50.0000');
      expect(result.transaction.newBalance).toBe('100.0000');
    });

    it('should accept string amount', async () => {
      await repository.createWallet('user123', 100);

      const result = await useCase.execute({
        userId: 'user123',
        amount: '25.50',
      });

      expect(result.wallet.balance).toBe('74.5000');
    });

    it('should handle decimal amounts correctly', async () => {
      await repository.createWallet('user123', 50.75);

      const result = await useCase.execute({
        userId: 'user123',
        amount: 10.25,
      });

      expect(result.wallet.balance).toBe('40.5000');
    });

    it('should allow debiting exact balance (balance = 0)', async () => {
      await repository.createWallet('user123', 100);

      const result = await useCase.execute({
        userId: 'user123',
        amount: 100,
      });

      expect(result.wallet.balance).toBe('0.0000');
    });

    it('should throw error if wallet not found', async () => {
      await expect(
        useCase.execute({
          userId: 'nonexistent',
          amount: 50,
        })
      ).rejects.toThrow('Wallet not found for user nonexistent');
    });

    it('should throw InsufficientBalanceException if balance < amount', async () => {
      await repository.createWallet('user123', 50);

      await expect(
        useCase.execute({
          userId: 'user123',
          amount: 100,
        })
      ).rejects.toThrow(InsufficientBalanceException);
    });

    it('should include helpful error message for insufficient balance', async () => {
      await repository.createWallet('user123', 30);

      await expect(
        useCase.execute({
          userId: 'user123',
          amount: 50,
        })
      ).rejects.toThrow('Cannot debit $50.00 from wallet');
    });

    it('should throw error if amount is zero', async () => {
      await repository.createWallet('user123', 100);

      await expect(
        useCase.execute({
          userId: 'user123',
          amount: 0,
        })
      ).rejects.toThrow('Debit amount must be positive');
    });

    it('should throw error if amount is negative', async () => {
      await repository.createWallet('user123', 100);

      await expect(
        useCase.execute({
          userId: 'user123',
          amount: -50,
        })
      ).rejects.toThrow('Debit amount must be positive');
    });

    it('should throw error if wallet is frozen', async () => {
      const wallet = await repository.createWallet('user123', 100);
      wallet.freeze();
      await repository.save(wallet);

      await expect(
        useCase.execute({
          userId: 'user123',
          amount: 50,
        })
      ).rejects.toThrow('Wallet is frozen');
    });

    it('should throw error if wallet is closed', async () => {
      const wallet = await repository.createWallet('user123', 100);
      wallet.debit(Money.create(100)); // Vaciar balance
      wallet.close();
      await repository.save(wallet);

      await expect(
        useCase.execute({
          userId: 'user123',
          amount: 50,
        })
      ).rejects.toThrow('Wallet is closed');
    });

    it('should handle multiple debits sequentially', async () => {
      await repository.createWallet('user123', 100);

      await useCase.execute({ userId: 'user123', amount: 10 });
      await useCase.execute({ userId: 'user123', amount: 20 });
      const result = await useCase.execute({ userId: 'user123', amount: 30 });

      expect(result.wallet.balance).toBe('40.0000');
    });

    it('should not change balance after failed debit', async () => {
      await repository.createWallet('user123', 50);

      try {
        await useCase.execute({ userId: 'user123', amount: 100 });
      } catch (error) {
        // Esperado
      }

      const wallet = await repository.findByUserId('user123');
      expect(wallet!.balance.toPlainString()).toBe('50.0000');
    });

    it('should update wallet timestamp', async () => {
      const wallet = await repository.createWallet('user123', 100);
      const originalTimestamp = wallet.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      await useCase.execute({ userId: 'user123', amount: 20 });

      const updatedWallet = await repository.findByUserId('user123');
      expect(updatedWallet!.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
    });
  });
});
