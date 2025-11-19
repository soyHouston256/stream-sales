import { GetUserByIdUseCase } from '../GetUserByIdUseCase';
import { RegisterUserUseCase } from '../RegisterUserUseCase';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User } from '@/domain/entities/User';
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

describe('GetUserByIdUseCase', () => {
  let userRepository: MockUserRepository;
  let getUserByIdUseCase: GetUserByIdUseCase;
  let registerUserUseCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
    registerUserUseCase = new RegisterUserUseCase(userRepository);
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
