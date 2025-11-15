import { CreateWalletUseCase } from '../CreateWalletUseCase';
import { Wallet } from '../../../domain/entities/Wallet';
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
    for (const wallet of this.wallets.values()) {
      if (wallet.userId === userId) {
        return wallet;
      }
    }
    return null;
  }

  async existsByUserId(userId: string): Promise<boolean> {
    for (const wallet of this.wallets.values()) {
      if (wallet.userId === userId) {
        return true;
      }
    }
    return false;
  }

  async delete(id: string): Promise<boolean> {
    return this.wallets.delete(id);
  }
}

describe('CreateWalletUseCase', () => {
  let useCase: CreateWalletUseCase;
  let repository: MockWalletRepository;

  beforeEach(() => {
    repository = new MockWalletRepository();
    useCase = new CreateWalletUseCase(repository);
  });

  describe('execute', () => {
    it('should create a new wallet for a user', async () => {
      const result = await useCase.execute({
        userId: 'user123',
      });

      expect(result.wallet).toBeDefined();
      expect(result.wallet.userId).toBe('user123');
      expect(result.wallet.balance).toBe('0.0000');
      expect(result.wallet.currency).toBe('USD');
      expect(result.wallet.status).toBe('active');
    });

    it('should create wallet with custom currency', async () => {
      const result = await useCase.execute({
        userId: 'user123',
        currency: 'EUR',
      });

      expect(result.wallet.currency).toBe('EUR');
    });

    it('should generate unique wallet ID', async () => {
      const result1 = await useCase.execute({ userId: 'user1' });
      const result2 = await useCase.execute({ userId: 'user2' });

      expect(result1.wallet.id).not.toBe(result2.wallet.id);
    });

    it('should set timestamps', async () => {
      const result = await useCase.execute({ userId: 'user123' });

      expect(result.wallet.createdAt).toBeInstanceOf(Date);
      expect(result.wallet.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error if user already has a wallet', async () => {
      // Crear primera wallet
      await useCase.execute({ userId: 'user123' });

      // Intentar crear segunda wallet para mismo usuario
      await expect(
        useCase.execute({ userId: 'user123' })
      ).rejects.toThrow('User user123 already has a wallet');
    });

    it('should save wallet to repository', async () => {
      const result = await useCase.execute({ userId: 'user123' });

      const savedWallet = await repository.findByUserId('user123');
      expect(savedWallet).not.toBeNull();
      expect(savedWallet?.id).toBe(result.wallet.id);
    });

    it('should return wallet with zero balance', async () => {
      const result = await useCase.execute({ userId: 'user123' });

      expect(result.wallet.balance).toBe('0.0000');
    });
  });
});
