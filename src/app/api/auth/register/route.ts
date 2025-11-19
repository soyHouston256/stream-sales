import { NextRequest, NextResponse } from 'next/server';
import { RegisterUserUseCase } from '@/application/use-cases/RegisterUserUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { JwtService } from '@/infrastructure/auth/JwtService';
import { UserAlreadyExistsException } from '@/domain/exceptions/DomainException';
import { RateLimiter } from '@/infrastructure/security/RateLimiter';
import { SecurityLogger, SecurityEventType } from '@/infrastructure/security/SecurityLogger';
import { InputSanitizer } from '@/infrastructure/security/InputSanitizer';

const userRepository = new PrismaUserRepository();
const registerUserUseCase = new RegisterUserUseCase(userRepository);
const jwtService = new JwtService();

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // SECURITY: Sanitize inputs to prevent XSS
    const sanitizedEmail = InputSanitizer.sanitize(email);
    const sanitizedName = name ? InputSanitizer.sanitizeName(name) : undefined;

    // SECURITY: Check for XSS patterns
    if (InputSanitizer.containsXSS(email) || InputSanitizer.containsXSS(password) || (name && InputSanitizer.containsXSS(name))) {
      SecurityLogger.log(
        SecurityEventType.XSS_ATTEMPT,
        'XSS attempt detected in registration form',
        { identifier: clientIp, metadata: { email: sanitizedEmail } }
      );
      return NextResponse.json(
        { error: 'Invalid input detected' },
        { status: 400 }
      );
    }

    // SECURITY: Rate limiting - 3 registrations per hour per IP
    const ipRateLimit = RateLimiter.isRateLimited(
      `register:ip:${clientIp}`,
      3,
      60 * 60 * 1000,
      60 * 60 * 1000
    );

    if (ipRateLimit.limited) {
      SecurityLogger.log(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        'Registration rate limit exceeded',
        { identifier: clientIp, metadata: { retryAfter: ipRateLimit.retryAfter } }
      );
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': ipRateLimit.retryAfter?.toString() || '3600' } }
      );
    }

    const result = await registerUserUseCase.execute({
      email,
      password,
      name: sanitizedName,
    });

    const token = jwtService.sign({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });

    // SECURITY: Log successful registration
    SecurityLogger.log(
      SecurityEventType.REGISTRATION,
      'New user registered',
      { identifier: clientIp, userId: result.user.id, metadata: { email: result.user.email } }
    );

    // SECURITY: Don't send token in response body, only in httpOnly cookie
    const response = NextResponse.json({
      user: result.user,
      success: true,
    }, { status: 201 });

    // SECURITY: Set httpOnly cookie to prevent XSS token theft
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);

    response.cookies.set('token', token, {
      httpOnly: true, // SECURITY: Prevent JavaScript access to token
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // SECURITY: Strict same-site policy for better CSRF protection
      expires: expirationDate,
      path: '/',
    });

    return response;

  } catch (error) {
    if (error instanceof UserAlreadyExistsException) {
      // SECURITY: Log attempted duplicate registration
      SecurityLogger.log(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        'Attempted registration with existing email',
        { identifier: clientIp, metadata: { email: body.email } }
      );

      // SECURITY: Generic message to prevent email enumeration
      return NextResponse.json(
        { error: 'Registration failed. Please try again with different credentials.' },
        { status: 409 }
      );
    }

    if (error instanceof Error) {
      // SECURITY: Don't expose internal error details
      SecurityLogger.log(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        `Registration error: ${error.message}`,
        { identifier: clientIp, metadata: { email: body?.email } }
      );

      return NextResponse.json(
        { error: error.message }, // Password validation errors are safe to show
        { status: 400 }
      );
    }

    // SECURITY: Log unexpected errors
    SecurityLogger.log(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      'Unexpected error during registration',
      { identifier: clientIp }
    );

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
