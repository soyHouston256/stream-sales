import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/dashboard/:path*'],
};

export async function middleware(request: NextRequest) {
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

  return NextResponse.next();
}
