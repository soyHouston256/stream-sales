import { NextRequest, NextResponse } from 'next/server';
import { UpdateUserPasswordUseCase } from '@/application/use-cases/UpdateUserPasswordUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { JwtService } from '@/infrastructure/auth/JwtService';
import { UserNotFoundException, InvalidPasswordException } from '@/domain/exceptions/DomainException';
import { SecurityLogger, SecurityEventType } from '@/infrastructure/security/SecurityLogger';
import { RateLimiter } from '@/infrastructure/security/RateLimiter';
import { z } from 'zod';

const userRepository = new PrismaUserRepository();
const updateUserPasswordUseCase = new UpdateUserPasswordUseCase(userRepository);
const jwtService = new JwtService();

const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function PUT(request: NextRequest) {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    try {
        // SECURITY: Get token from httpOnly cookie
        const token = request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Verify JWT
        const payload = jwtService.verify(token);

        // Parse body
        const body = await request.json();
        const validatedData = updatePasswordSchema.parse(body);

        // Execute use case
        await updateUserPasswordUseCase.execute({
            userId: payload.userId,
            currentPassword: validatedData.currentPassword,
            newPassword: validatedData.newPassword,
        });

        SecurityLogger.log(
            SecurityEventType.PASSWORD_CHANGED,
            'User password changed',
            { identifier: clientIp, userId: payload.userId }
        );

        return NextResponse.json({
            message: 'Password updated successfully',
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
        }

        if (error instanceof InvalidPasswordException) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof UserNotFoundException) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (error instanceof Error && (error.message === 'Invalid token' || error.message === 'Token has been revoked')) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        // Handle domain exceptions from Password VO (e.g. complexity requirements)
        if (error instanceof Error && error.message.startsWith('Password must')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        console.error('Password update error:', error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}
