import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { Email } from '@/domain/value-objects/Email';
import { InvalidCredentialsException } from '@/domain/exceptions/DomainException';

export interface LoginUserDTO {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

export class LoginUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: LoginUserDTO): Promise<LoginUserResponse> {
    // Create email value object
    const email = Email.create(data.email);

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(data.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    return {
      user: {
        id: user.id,
        email: user.email.value,
        name: user.name,
        role: user.role,
      },
    };
  }
}
