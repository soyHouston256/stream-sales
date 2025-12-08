import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User } from '@/domain/entities/User';
import { UserNotFoundException } from '@/domain/exceptions/DomainException';

interface UpdateUserProfileDTO {
    userId: string;
    name?: string;
    username?: string;
    phoneNumber?: string;
    countryCode?: string;
}

interface UpdateUserProfileResult {
    user: {
        id: string;
        email: string;
        name: string | undefined;
        role: string;
        username: string | undefined;
        phoneNumber: string | undefined;
    };
}

export class UpdateUserProfileUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(data: UpdateUserProfileDTO): Promise<UpdateUserProfileResult> {
        const user = await this.userRepository.findById(data.userId);

        if (!user) {
            throw new UserNotFoundException(data.userId);
        }

        // Update fields
        if (data.name) user.updateName(data.name);
        if (data.username) user.updateUsername(data.username);
        if (data.phoneNumber) user.updatePhoneNumber(data.phoneNumber, data.countryCode);

        const savedUser = await this.userRepository.update(user);

        return {
            user: {
                id: savedUser.id,
                email: savedUser.email.value,
                name: savedUser.name,
                role: savedUser.role,
                username: savedUser.username,
                phoneNumber: savedUser.phoneNumber,
            },
        };
    }
}
