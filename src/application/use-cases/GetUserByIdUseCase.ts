import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { UserNotFoundException } from '@/domain/exceptions/DomainException';

export interface GetUserByIdResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
    username?: string;
    phoneNumber?: string;
    countryCode?: string;
  };
}

export class GetUserByIdUseCase {
  constructor(private userRepository: IUserRepository) { }

  async execute(userId: string): Promise<GetUserByIdResponse> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    return {
      user: {
        id: user.id,
        email: user.email.value,
        name: user.name,
        role: user.role,
        username: user.username,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
      },
    };
  }
}
