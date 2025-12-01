import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User } from '@/domain/entities/User';
import { UserNotFoundException } from '@/domain/exceptions/DomainException';

interface UpdateUserProfileDTO {
    userId: string;
    name: string;
}

interface UpdateUserProfileResult {
    user: {
        id: string;
        email: string;
        name: string | undefined;
        role: string;
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
        if (data.name) {
            user.updateName(data.name);
        }

        const savedUser = await this.userRepository.update(user);

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
