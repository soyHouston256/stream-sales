import { NextRequest, NextResponse } from 'next/server';
import { JwtService } from '@/infrastructure/auth/JwtService';
import { SecurityLogger, SecurityEventType } from '@/infrastructure/security/SecurityLogger';

const jwtService = new JwtService();

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    // Get token from cookie
    const token = request.cookies.get('token')?.value;

    if (token) {
      // Decode token to get user info for logging
      const decoded = jwtService.decode(token);

      // SECURITY: Add token to blacklist to invalidate it
      jwtService.revoke(token);

      // SECURITY: Log logout event
      if (decoded) {
        SecurityLogger.log(
          SecurityEventType.LOGOUT,
          'User logged out',
          { identifier: clientIp, userId: decoded.userId, metadata: { email: decoded.email } }
        );
      }
    }

    // Clear the cookie
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    // Even if there's an error, clear the cookie
    const response = NextResponse.json({ success: true, message: 'Logged out' });

    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0),
      path: '/',
    });

    return response;
  }
}
