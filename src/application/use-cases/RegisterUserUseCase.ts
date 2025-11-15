import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User } from '@/domain/entities/User';
import { Email } from '@/domain/value-objects/Email';
import { Password } from '@/domain/value-objects/Password';
import { UserAlreadyExistsException } from '@/domain/exceptions/DomainException';

export interface RegisterUserDTO {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterUserResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

export class RegisterUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: RegisterUserDTO): Promise<RegisterUserResponse> {
    // Create value objects
    const email = Email.create(data.email);
    const password = await Password.create(data.password);

    // Check if user already exists
    const userExists = await this.userRepository.existsByEmail(email);
    if (userExists) {
      throw new UserAlreadyExistsException(email.value);
    }

    // Create user entity
    const user = User.create({
      email,
      password,
      name: data.name,
      role: 'user',
    });

    // Save user
    const savedUser = await this.userRepository.save(user);

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email.value,
        name: savedUser.name,
        role: savedUser.role,
      },
    };
  }
}
