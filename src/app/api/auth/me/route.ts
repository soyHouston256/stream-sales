import { NextRequest, NextResponse } from 'next/server';
import { GetUserByIdUseCase } from '@/application/use-cases/GetUserByIdUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { JwtService } from '@/infrastructure/auth/JwtService';
import { UserNotFoundException } from '@/domain/exceptions/DomainException';
import { SecurityLogger, SecurityEventType } from '@/infrastructure/security/SecurityLogger';
import { RateLimiter } from '@/infrastructure/security/RateLimiter';

export const dynamic = 'force-dynamic';

const userRepository = new PrismaUserRepository();
const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
const jwtService = new JwtService();

export async function GET(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    // SECURITY: Get token from httpOnly cookie instead of Authorization header
    const token = request.cookies.get('token')?.value;

    if (!token) {
      SecurityLogger.log(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        'Attempted access to /api/auth/me without token',
        { identifier: clientIp }
      );

      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // SECURITY: Rate limiting - 100 requests per minute
    const rateLimit = RateLimiter.isRateLimited(
      `me:ip:${clientIp}`,
      100,
      60 * 1000,
      5 * 60 * 1000
    );

    if (rateLimit.limited) {
      SecurityLogger.log(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded for /api/auth/me',
        { identifier: clientIp }
      );

      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '300' } }
      );
    }

    // Verify JWT (runs in Node.js runtime, not Edge)
    const payload = jwtService.verify(token);

    // Get user from database
    const result = await getUserByIdUseCase.execute(payload.userId);

    return NextResponse.json({
      user: result.user,
    });

  } catch (error) {
    if (error instanceof UserNotFoundException) {
      SecurityLogger.log(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        'User not found for valid token',
        { identifier: clientIp }
      );

      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (error instanceof Error && (error.message === 'Invalid token' || error.message === 'Token has been revoked')) {
      SecurityLogger.log(
        SecurityEventType.INVALID_TOKEN,
        `Token validation failed: ${error.message}`,
        { identifier: clientIp }
      );

      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    SecurityLogger.log(
      SecurityEventType.UNAUTHORIZED_ACCESS,
      'Unexpected error in /api/auth/me',
      { identifier: clientIp }
    );

    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
