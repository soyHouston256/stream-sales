import { TransferMoneyUseCase } from '../TransferMoneyUseCase';
import { Wallet } from '../../../domain/entities/Wallet';
import { Money } from '../../../domain/value-objects/Money';
import { InsufficientBalanceException } from '../../../domain/exceptions/InsufficientBalanceException';
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

  async createWallet(userId: string, initialBalance: number = 0, currency = 'USD'): Promise<Wallet> {
    const wallet = Wallet.create({ userId, currency });
    if (initialBalance > 0) {
      wallet.credit(Money.create(initialBalance, currency));
    }
    return this.save(wallet);
  }
}

describe('TransferMoneyUseCase', () => {
  let useCase: TransferMoneyUseCase;
  let repository: MockWalletRepository;

  beforeEach(() => {
    repository = new MockWalletRepository();
    useCase = new TransferMoneyUseCase(repository);
  });

  describe('execute', () => {
    it('should transfer money from sender to receiver', async () => {
      await repository.createWallet('sender', 100);
      await repository.createWallet('receiver', 50);

      const result = await useCase.execute({
        fromUserId: 'sender',
        toUserId: 'receiver',
        amount: 30,
      });

      expect(result.senderWallet.newBalance).toBe('70.0000');
      expect(result.receiverWallet.newBalance).toBe('80.0000');
    });

    it('should return complete transfer details', async () => {
      await repository.createWallet('sender', 100);
      await repository.createWallet('receiver', 50);

      const result = await useCase.execute({
        fromUserId: 'sender',
        toUserId: 'receiver',
        amount: 25,
        description: 'Pago por servicio',
      });

      expect(result.transfer.fromUserId).toBe('sender');
      expect(result.transfer.toUserId).toBe('receiver');
      expect(result.transfer.amount).toBe('25.0000');
      expect(result.transfer.currency).toBe('USD');
      expect(result.transfer.description).toBe('Pago por servicio');
    });

    it('should return previous and new balances for both wallets', async () => {
      await repository.createWallet('sender', 100);
      await repository.createWallet('receiver', 25);

      const result = await useCase.execute({
        fromUserId: 'sender',
        toUserId: 'receiver',
        amount: 50,
      });

      expect(result.senderWallet.previousBalance).toBe('100.0000');
      expect(result.senderWallet.newBalance).toBe('50.0000');
      expect(result.receiverWallet.previousBalance).toBe('25.0000');
      expect(result.receiverWallet.newBalance).toBe('75.0000');
    });

    it('should accept string amount', async () => {
      await repository.createWallet('sender', 100);
      await repository.createWallet('receiver', 0);

      const result = await useCase.execute({
        fromUserId: 'sender',
        toUserId: 'receiver',
        amount: '35.50',
      });

      expect(result.senderWallet.newBalance).toBe('64.5000');
      expect(result.receiverWallet.newBalance).toBe('35.5000');
    });

    it('should allow transferring entire balance', async () => {
      await repository.createWallet('sender', 100);
      await repository.createWallet('receiver', 0);

      const result = await useCase.execute({
        fromUserId: 'sender',
        toUserId: 'receiver',
        amount: 100,
      });

      expect(result.senderWallet.newBalance).toBe('0.0000');
      expect(result.receiverWallet.newBalance).toBe('100.0000');
    });

    it('should throw error if sender wallet not found', async () => {
      await repository.createWallet('receiver', 50);

      await expect(
        useCase.execute({
          fromUserId: 'nonexistent',
          toUserId: 'receiver',
          amount: 30,
        })
      ).rejects.toThrow('Sender wallet not found');
    });

    it('should throw error if receiver wallet not found', async () => {
      await repository.createWallet('sender', 100);

      await expect(
        useCase.execute({
          fromUserId: 'sender',
          toUserId: 'nonexistent',
          amount: 30,
        })
      ).rejects.toThrow('Receiver wallet not found');
    });

    it('should throw error for self-transfer', async () => {
      await repository.createWallet('user123', 100);

      await expect(
        useCase.execute({
          fromUserId: 'user123',
          toUserId: 'user123',
          amount: 50,
        })
      ).rejects.toThrow('Cannot transfer money to yourself');
    });

    it('should throw InsufficientBalanceException if sender balance < amount', async () => {
      await repository.createWallet('sender', 30);
      await repository.createWallet('receiver', 0);

      await expect(
        useCase.execute({
          fromUserId: 'sender',
          toUserId: 'receiver',
          amount: 50,
        })
      ).rejects.toThrow(InsufficientBalanceException);
    });

    it('should throw error if amount is zero', async () => {
      await repository.createWallet('sender', 100);
      await repository.createWallet('receiver', 0);

      await expect(
        useCase.execute({
          fromUserId: 'sender',
          toUserId: 'receiver',
          amount: 0,
        })
      ).rejects.toThrow('Transfer amount must be positive');
    });

    it('should throw error if amount is negative', async () => {
      await repository.createWallet('sender', 100);
      await repository.createWallet('receiver', 0);

      await expect(
        useCase.execute({
          fromUserId: 'sender',
          toUserId: 'receiver',
          amount: -20,
        })
      ).rejects.toThrow('Transfer amount must be positive');
    });

    it('should throw error if sender wallet is frozen', async () => {
      const senderWallet = await repository.createWallet('sender', 100);
      await repository.createWallet('receiver', 0);

      senderWallet.freeze();
      await repository.save(senderWallet);

      await expect(
        useCase.execute({
          fromUserId: 'sender',
          toUserId: 'receiver',
          amount: 30,
        })
      ).rejects.toThrow('Wallet is frozen');
    });

    it('should throw error if receiver wallet is frozen', async () => {
      await repository.createWallet('sender', 100);
      const receiverWallet = await repository.createWallet('receiver', 0);

      receiverWallet.freeze();
      await repository.save(receiverWallet);

      await expect(
        useCase.execute({
          fromUserId: 'sender',
          toUserId: 'receiver',
          amount: 30,
        })
      ).rejects.toThrow('Wallet is frozen');
    });

    it('should throw error if currencies do not match', async () => {
      await repository.createWallet('sender', 100, 'USD');
      await repository.createWallet('receiver', 0, 'EUR');

      await expect(
        useCase.execute({
          fromUserId: 'sender',
          toUserId: 'receiver',
          amount: 30,
        })
      ).rejects.toThrow('Currency mismatch');
    });

    it('should not change balances after failed transfer', async () => {
      await repository.createWallet('sender', 30);
      await repository.createWallet('receiver', 50);

      try {
        await useCase.execute({
          fromUserId: 'sender',
          toUserId: 'receiver',
          amount: 100, // Insuficiente
        });
      } catch (error) {
        // Esperado
      }

      const senderWallet = await repository.findByUserId('sender');
      const receiverWallet = await repository.findByUserId('receiver');

      expect(senderWallet!.balance.toPlainString()).toBe('30.0000');
      expect(receiverWallet!.balance.toPlainString()).toBe('50.0000');
    });

    it('should handle decimal amounts precisely', async () => {
      await repository.createWallet('sender', 100.99);
      await repository.createWallet('receiver', 25.50);

      const result = await useCase.execute({
        fromUserId: 'sender',
        toUserId: 'receiver',
        amount: 10.25,
      });

      expect(result.senderWallet.newBalance).toBe('90.7400');
      expect(result.receiverWallet.newBalance).toBe('35.7500');
    });

    it('should persist both wallet changes', async () => {
      await repository.createWallet('sender', 100);
      await repository.createWallet('receiver', 0);

      await useCase.execute({
        fromUserId: 'sender',
        toUserId: 'receiver',
        amount: 40,
      });

      const senderWallet = await repository.findByUserId('sender');
      const receiverWallet = await repository.findByUserId('receiver');

      expect(senderWallet!.balance.toPlainString()).toBe('60.0000');
      expect(receiverWallet!.balance.toPlainString()).toBe('40.0000');
    });
  });
});
