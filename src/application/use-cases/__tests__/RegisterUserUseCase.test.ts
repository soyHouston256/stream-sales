import { RegisterUserUseCase } from '../RegisterUserUseCase';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { IWalletRepository } from '@/domain/repositories/IWalletRepository';
import { User } from '@/domain/entities/User';
import { Wallet } from '@/domain/entities/Wallet';
import { Email } from '@/domain/value-objects/Email';
import { UserAlreadyExistsException } from '@/domain/exceptions/DomainException';

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

describe('RegisterUserUseCase', () => {
  let userRepository: MockUserRepository;
  let walletRepository: MockWalletRepository;
  let registerUserUseCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    walletRepository = new MockWalletRepository();
    registerUserUseCase = new RegisterUserUseCase(userRepository, walletRepository);
  });

  it('should register a new user successfully', async () => {
    const result = await registerUserUseCase.execute({
      email: 'test@example.com',
      password: 'TestPass123!',
      name: 'Test User',
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBe('Test User');
    expect(result.user.role).toBe('user');
    expect(result.user.id).toBeDefined();
  });

  it('should create a wallet for new user', async () => {
    const result = await registerUserUseCase.execute({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(result.wallet).toBeDefined();
    expect(result.wallet.id).toBeDefined();
    expect(result.wallet.balance).toBe('0.0000');
    expect(result.wallet.currency).toBe('USD');
    expect(result.wallet.status).toBe('active');
  });

  it('should register user without name', async () => {
    const result = await registerUserUseCase.execute({
      email: 'test@example.com',
      password: 'TestPass123!',
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBeUndefined();
  });

  it('should throw error if user already exists', async () => {
    await registerUserUseCase.execute({
      email: 'test@example.com',
      password: 'TestPass123!',
    });

    await expect(
      registerUserUseCase.execute({
        email: 'test@example.com',
        password: 'ValidPass456!',
      })
    ).rejects.toThrow(UserAlreadyExistsException);
  });

  it('should throw error for invalid email', async () => {
    await expect(
      registerUserUseCase.execute({
        email: 'invalid-email',
        password: 'TestPass123!',
      })
    ).rejects.toThrow('Invalid email format');
  });

  it('should throw error for short password', async () => {
    await expect(
      registerUserUseCase.execute({
        email: 'test@example.com',
        password: 'Short1!',
      })
    ).rejects.toThrow('Password must be at least 8 characters long');
  });

  it('should normalize email to lowercase', async () => {
    const result = await registerUserUseCase.execute({
      email: 'TEST@EXAMPLE.COM',
      password: 'TestPass123!',
    });

    expect(result.user.email).toBe('test@example.com');
  });
});
