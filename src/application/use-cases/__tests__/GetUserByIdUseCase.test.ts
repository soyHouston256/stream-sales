import { GetUserByIdUseCase } from '../GetUserByIdUseCase';
import { RegisterUserUseCase } from '../RegisterUserUseCase';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { IWalletRepository } from '@/domain/repositories/IWalletRepository';
import { User } from '@/domain/entities/User';
import { Wallet } from '@/domain/entities/Wallet';
import { Email } from '@/domain/value-objects/Email';
import { UserNotFoundException } from '@/domain/exceptions/DomainException';

class MockUserRepository implements IUserRepository {
  private users: User[] = [];

  async save(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    return this.users.find((u) => u.email.equals(email)) || null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    return this.users.some((u) => u.email.equals(email));
  }
}

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

describe('GetUserByIdUseCase', () => {
  let userRepository: MockUserRepository;
  let walletRepository: MockWalletRepository;
  let getUserByIdUseCase: GetUserByIdUseCase;
  let registerUserUseCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    walletRepository = new MockWalletRepository();
    getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
    registerUserUseCase = new RegisterUserUseCase(userRepository, walletRepository);
  });

  it('should get user by id', async () => {
    const registeredUser = await registerUserUseCase.execute({
      email: 'test@example.com',
      password: 'TestPass123!',
      name: 'Test User',
    });

    const result = await getUserByIdUseCase.execute(registeredUser.user.id);

    expect(result.user).toBeDefined();
    expect(result.user.id).toBe(registeredUser.user.id);
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBe('Test User');
  });

  it('should throw error for non-existent user', async () => {
    await expect(
      getUserByIdUseCase.execute('non-existent-id')
    ).rejects.toThrow(UserNotFoundException);
  });
});
