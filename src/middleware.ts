import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from './infrastructure/auth/middleware';

export async function middleware(request: NextRequest) {
  // Protect /api/auth/me endpoint
  if (request.nextUrl.pathname === '/api/auth/me') {
    return authMiddleware(request);
  }

  // Protect /dashboard route
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/me', '/dashboard/:path*'],
};
