import { NextRequest, NextResponse } from 'next/server';
import { UpdateUserProfileUseCase } from '@/application/use-cases/UpdateUserProfileUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { JwtService } from '@/infrastructure/auth/JwtService';
import { UserNotFoundException } from '@/domain/exceptions/DomainException';
import { SecurityLogger, SecurityEventType } from '@/infrastructure/security/SecurityLogger';
import { RateLimiter } from '@/infrastructure/security/RateLimiter';
import { z } from 'zod';

const userRepository = new PrismaUserRepository();
const updateUserProfileUseCase = new UpdateUserProfileUseCase(userRepository);
const jwtService = new JwtService();

const updateProfileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    username: z.string().min(3, 'Username must be at least 3 characters').max(20).regex(/^[a-zA-Z0-9_]+$/, 'Invalid username format').optional(),
    phoneNumber: z.string().optional(),
    countryCode: z.string().optional(),
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
        const validatedData = updateProfileSchema.parse(body);

        // Execute use case
        const result = await updateUserProfileUseCase.execute({
            userId: payload.userId,
            name: validatedData.name,
            username: validatedData.username,
            phoneNumber: validatedData.phoneNumber,
            countryCode: validatedData.countryCode,
        });

        SecurityLogger.log(
            SecurityEventType.USER_UPDATED,
            'User profile updated',
            { identifier: clientIp, userId: payload.userId }
        );

        return NextResponse.json({
            message: 'Profile updated successfully',
            user: result.user,
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
        }

        if (error instanceof UserNotFoundException) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (error instanceof Error && (error.message === 'Invalid token' || error.message === 'Token has been revoked')) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}
