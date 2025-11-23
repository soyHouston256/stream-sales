import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // SECURITY: Add security headers to all responses
  const headers = response.headers;

  // Content Security Policy - prevents XSS attacks
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: 'unsafe-inline' and 'unsafe-eval' needed for Next.js dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  headers.set('Content-Security-Policy', cspHeader);

  // Prevent clickjacking attacks
  headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Enable browser XSS protection
  headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy - don't leak referrer information
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy - disable unnecessary browser features
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Strict Transport Security - enforce HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Protect /dashboard route - simple cookie check
  // Full JWT validation happens in /api/auth/me route handler (Node.js runtime)
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Token exists, allow access
    // The dashboard will validate the token when it calls /api/auth/me
  }

  return response;
}
