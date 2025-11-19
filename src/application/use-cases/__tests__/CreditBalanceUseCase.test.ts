import { CreditBalanceUseCase } from '../CreditBalanceUseCase';
import { Wallet } from '../../../domain/entities/Wallet';
import { Money } from '../../../domain/value-objects/Money';
import { IWalletRepository } from '../../../domain/repositories/IWalletRepository';

// Mock del repository
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

  // Helper para tests
  async createWallet(userId: string, initialBalance: number = 0): Promise<Wallet> {
    const wallet = Wallet.create({ userId });
    if (initialBalance > 0) {
      wallet.credit(Money.create(initialBalance));
    }
    return this.save(wallet);
  }
}

describe('CreditBalanceUseCase', () => {
  let useCase: CreditBalanceUseCase;
  let repository: MockWalletRepository;

  beforeEach(() => {
    repository = new MockWalletRepository();
    useCase = new CreditBalanceUseCase(repository);
  });

  describe('execute', () => {
    it('should credit amount to wallet', async () => {
      await repository.createWallet('user123', 50);

      const result = await useCase.execute({
        userId: 'user123',
        amount: 100,
      });

      expect(result.wallet.balance).toBe('150.0000');
    });

    it('should return transaction details', async () => {
      await repository.createWallet('user123', 50);

      const result = await useCase.execute({
        userId: 'user123',
        amount: 100,
      });

      expect(result.transaction.previousBalance).toBe('50.0000');
      expect(result.transaction.amountCredited).toBe('100.0000');
      expect(result.transaction.newBalance).toBe('150.0000');
    });

    it('should accept string amount', async () => {
      await repository.createWallet('user123');

      const result = await useCase.execute({
        userId: 'user123',
        amount: '75.50',
      });

      expect(result.wallet.balance).toBe('75.5000');
    });

    it('should credit to wallet with zero balance', async () => {
      await repository.createWallet('user123');

      const result = await useCase.execute({
        userId: 'user123',
        amount: 100,
      });

      expect(result.wallet.balance).toBe('100.0000');
    });

    it('should handle decimal amounts correctly', async () => {
      await repository.createWallet('user123', 10.50);

      const result = await useCase.execute({
        userId: 'user123',
        amount: 5.25,
      });

      expect(result.wallet.balance).toBe('15.7500');
    });

    it('should throw error if wallet not found', async () => {
      await expect(
        useCase.execute({
          userId: 'nonexistent',
          amount: 100,
        })
      ).rejects.toThrow('Wallet not found for user nonexistent');
    });

    it('should throw error if amount is zero', async () => {
      await repository.createWallet('user123');

      await expect(
        useCase.execute({
          userId: 'user123',
          amount: 0,
        })
      ).rejects.toThrow('Credit amount must be positive');
    });

    it('should throw error if amount is negative', async () => {
      await repository.createWallet('user123');

      await expect(
        useCase.execute({
          userId: 'user123',
          amount: -50,
        })
      ).rejects.toThrow('Credit amount must be positive');
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
      const wallet = await repository.createWallet('user123');
      wallet.close();
      await repository.save(wallet);

      await expect(
        useCase.execute({
          userId: 'user123',
          amount: 50,
        })
      ).rejects.toThrow('Wallet is closed');
    });

    it('should handle multiple credits sequentially', async () => {
      await repository.createWallet('user123');

      await useCase.execute({ userId: 'user123', amount: 10 });
      await useCase.execute({ userId: 'user123', amount: 20 });
      const result = await useCase.execute({ userId: 'user123', amount: 30 });

      expect(result.wallet.balance).toBe('60.0000');
    });

    it('should update wallet timestamp', async () => {
      const wallet = await repository.createWallet('user123');
      const originalTimestamp = wallet.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay

      await useCase.execute({ userId: 'user123', amount: 50 });

      const updatedWallet = await repository.findByUserId('user123');
      expect(updatedWallet!.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
    });
  });
});
