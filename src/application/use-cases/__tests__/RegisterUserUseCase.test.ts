import { RegisterUserUseCase } from '../RegisterUserUseCase';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User } from '@/domain/entities/User';
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

describe('RegisterUserUseCase', () => {
  let userRepository: MockUserRepository;
  let registerUserUseCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    registerUserUseCase = new RegisterUserUseCase(userRepository);
  });

  it('should register a new user successfully', async () => {
    const result = await registerUserUseCase.execute({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBe('Test User');
    expect(result.user.role).toBe('user');
    expect(result.user.id).toBeDefined();
  });

  it('should register user without name', async () => {
    const result = await registerUserUseCase.execute({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBeUndefined();
  });

  it('should throw error if user already exists', async () => {
    await registerUserUseCase.execute({
      email: 'test@example.com',
      password: 'password123',
    });

    await expect(
      registerUserUseCase.execute({
        email: 'test@example.com',
        password: 'password456',
      })
    ).rejects.toThrow(UserAlreadyExistsException);
  });

  it('should throw error for invalid email', async () => {
    await expect(
      registerUserUseCase.execute({
        email: 'invalid-email',
        password: 'password123',
      })
    ).rejects.toThrow('Invalid email format');
  });

  it('should throw error for short password', async () => {
    await expect(
      registerUserUseCase.execute({
        email: 'test@example.com',
        password: '12345',
      })
    ).rejects.toThrow('Password must be at least 6 characters long');
  });

  it('should normalize email to lowercase', async () => {
    const result = await registerUserUseCase.execute({
      email: 'TEST@EXAMPLE.COM',
      password: 'password123',
    });

    expect(result.user.email).toBe('test@example.com');
  });
});
