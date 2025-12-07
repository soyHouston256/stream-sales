import { NextRequest, NextResponse } from 'next/server';
import { LoginUserUseCase } from '@/application/use-cases/LoginUserUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { JwtService } from '@/infrastructure/auth/JwtService';
import { InvalidCredentialsException } from '@/domain/exceptions/DomainException';
import { RateLimiter } from '@/infrastructure/security/RateLimiter';
import { SecurityLogger, SecurityEventType } from '@/infrastructure/security/SecurityLogger';
import { InputSanitizer } from '@/infrastructure/security/InputSanitizer';

export const dynamic = 'force-dynamic';

const userRepository = new PrismaUserRepository();
const loginUserUseCase = new LoginUserUseCase(userRepository);
const jwtService = new JwtService();

export async function POST(request: NextRequest) {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Declare variables outside try block so they're accessible in catch
    let email: string | undefined;
    let body: any;

    try {
        body = await request.json();
        email = body.email;
        const password = body.password;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // SECURITY: Sanitize inputs to prevent XSS
        const sanitizedEmail = InputSanitizer.sanitize(email);

        // SECURITY: Check for XSS patterns
        if (InputSanitizer.containsXSS(email) || InputSanitizer.containsXSS(password)) {
            SecurityLogger.log(
                SecurityEventType.XSS_ATTEMPT,
                'XSS attempt detected in login form',
                { identifier: clientIp, metadata: { email: sanitizedEmail } }
            );
            return NextResponse.json(
                { error: 'Invalid input detected' },
                { status: 400 }
            );
        }

        // SECURITY: Rate limiting - 5 attempts per 15 minutes per IP
        const ipRateLimit = RateLimiter.isRateLimited(
            `login:ip:${clientIp}`,
            5,
            15 * 60 * 1000,
            15 * 60 * 1000
        );

        if (ipRateLimit.limited) {
            SecurityLogger.log(
                SecurityEventType.RATE_LIMIT_EXCEEDED,
                'Login rate limit exceeded for IP',
                { identifier: clientIp, metadata: { retryAfter: ipRateLimit.retryAfter } }
            );
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': ipRateLimit.retryAfter?.toString() || '900' } }
            );
        }

        // SECURITY: Rate limiting per email - 5 attempts per 15 minutes
        const emailRateLimit = RateLimiter.isRateLimited(
            `login:email:${sanitizedEmail.toLowerCase()}`,
            5,
            15 * 60 * 1000,
            15 * 60 * 1000
        );

        if (emailRateLimit.limited) {
            SecurityLogger.log(
                SecurityEventType.RATE_LIMIT_EXCEEDED,
                'Login rate limit exceeded for email',
                { identifier: clientIp, metadata: { email: sanitizedEmail, retryAfter: emailRateLimit.retryAfter } }
            );
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': emailRateLimit.retryAfter?.toString() || '900' } }
            );
        }

        const result = await loginUserUseCase.execute({
            email,
            password,
        });

        const token = jwtService.sign({
            userId: result.user.id,
            email: result.user.email,
            role: result.user.role,
        });

        // SECURITY: Reset rate limiters on successful login
        RateLimiter.reset(`login:ip:${clientIp}`);
        RateLimiter.reset(`login:email:${sanitizedEmail.toLowerCase()}`);

        // SECURITY: Log successful login
        SecurityLogger.log(
            SecurityEventType.LOGIN_SUCCESS,
            'User logged in successfully',
            { identifier: clientIp, userId: result.user.id, metadata: { email: result.user.email } }
        );

        // Send token in both response body (for client-side API calls) and httpOnly cookie (for SSR/middleware)
        const response = NextResponse.json({
            user: result.user,
            token: token, // Send token so frontend can use it in Authorization headers
            success: true,
        });

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
        if (error instanceof InvalidCredentialsException) {
            // SECURITY: Log failed login attempt
            SecurityLogger.log(
                SecurityEventType.LOGIN_FAILURE,
                'Invalid login credentials',
                { identifier: clientIp, metadata: { email: email || 'unknown' } }
            );

            // SECURITY: Generic error message to prevent user enumeration
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        if (error instanceof Error) {
            // SECURITY: Don't expose internal error details
            SecurityLogger.log(
                SecurityEventType.LOGIN_FAILURE,
                `Login error: ${error.message}`,
                { identifier: clientIp, metadata: { email: email || 'unknown' } }
            );

            return NextResponse.json(
                { error: 'Login failed. Please try again.' },
                { status: 400 }
            );
        }

        // SECURITY: Log unexpected errors
        SecurityLogger.log(
            SecurityEventType.LOGIN_FAILURE,
            'Unexpected error during login',
            { identifier: clientIp }
        );

        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again.' },
            { status: 500 }
        );
    }
}
