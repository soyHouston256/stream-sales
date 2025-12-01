import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User } from '@/domain/entities/User';
import { Password } from '@/domain/value-objects/Password';
import { UserNotFoundException, InvalidPasswordException } from '@/domain/exceptions/DomainException';

interface UpdateUserPasswordDTO {
    userId: string;
    currentPassword?: string; // Optional if admin is resetting, but for self-update it's good practice
    newPassword: string;
}

export class UpdateUserPasswordUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(data: UpdateUserPasswordDTO): Promise<void> {
        const user = await this.userRepository.findById(data.userId);

        if (!user) {
            throw new UserNotFoundException(data.userId);
        }

        // If current password is provided, verify it
        if (data.currentPassword) {
            const isMatch = await user.password.compare(data.currentPassword);
            if (!isMatch) {
                throw new InvalidPasswordException('Current password is incorrect');
            }
        }

        // Create new password VO
        const newPasswordVO = await Password.create(data.newPassword);

        user.updatePassword(newPasswordVO);

        await this.userRepository.update(user);
    }
}
