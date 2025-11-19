import { LoginUserUseCase } from '../LoginUserUseCase';
import { RegisterUserUseCase } from '../RegisterUserUseCase';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { IWalletRepository } from '@/domain/repositories/IWalletRepository';
import { User } from '@/domain/entities/User';
import { Wallet } from '@/domain/entities/Wallet';
import { Email } from '@/domain/value-objects/Email';
import { InvalidCredentialsException } from '@/domain/exceptions/DomainException';

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

describe('LoginUserUseCase', () => {
  let userRepository: MockUserRepository;
  let walletRepository: MockWalletRepository;
  let loginUserUseCase: LoginUserUseCase;
  let registerUserUseCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    walletRepository = new MockWalletRepository();
    loginUserUseCase = new LoginUserUseCase(userRepository);
    registerUserUseCase = new RegisterUserUseCase(userRepository, walletRepository);
  });

  it('should login user with correct credentials', async () => {
    // First register a user
    await registerUserUseCase.execute({
      email: 'test@example.com',
      password: 'TestPass123!',
      name: 'Test User',
    });

    // Then try to login
    const result = await loginUserUseCase.execute({
      email: 'test@example.com',
      password: 'TestPass123!',
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBe('Test User');
  });

  it('should throw error for non-existent user', async () => {
    await expect(
      loginUserUseCase.execute({
        email: 'nonexistent@example.com',
        password: 'TestPass123!',
      })
    ).rejects.toThrow(InvalidCredentialsException);
  });

  it('should throw error for incorrect password', async () => {
    await registerUserUseCase.execute({
      email: 'test@example.com',
      password: 'TestPass123!',
    });

    await expect(
      loginUserUseCase.execute({
        email: 'test@example.com',
        password: 'WrongPass456!',
      })
    ).rejects.toThrow(InvalidCredentialsException);
  });

  it('should login with email in different case', async () => {
    await registerUserUseCase.execute({
      email: 'test@example.com',
      password: 'TestPass123!',
    });

    const result = await loginUserUseCase.execute({
      email: 'TEST@EXAMPLE.COM',
      password: 'TestPass123!',
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
  });

  it('should throw error for invalid email format', async () => {
    await expect(
      loginUserUseCase.execute({
        email: 'invalid-email',
        password: 'TestPass123!',
      })
    ).rejects.toThrow('Invalid email format');
  });
});
