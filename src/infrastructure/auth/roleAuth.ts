import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import type { UserRole } from '@/types/auth';

export interface AuthResult {
  success: boolean;
  userId?: string;
  email?: string;
  role?: string;
  error?: NextResponse;
}

/**
 * Verifies JWT token and checks if user has one of the allowed roles
 * @param request - NextRequest object
 * @param allowedRoles - Array of roles that are allowed to access the resource
 * @returns AuthResult with user info or error response
 */
export async function verifyUserRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<AuthResult> {
  try {
    // 1. Verify JWT token
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.substring(7);
    const payload = verifyJWT(token);

    if (!payload || !payload.userId) {
      return {
        success: false,
        error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
      };
    }

    // 2. Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return {
        success: false,
        error: NextResponse.json({ error: 'User not found' }, { status: 404 }),
      };
    }

    // 3. Check if user has one of the allowed roles
    if (!allowedRoles.includes(user.role as UserRole)) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          },
          { status: 403 }
        ),
      };
    }

    // 4. Return success with user info
    return {
      success: true,
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  } catch (error: any) {
    console.error('Error verifying user role:', error);
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Verifies that the user is an admin
 */
export async function verifyAdmin(request: NextRequest): Promise<AuthResult> {
  return verifyUserRole(request, ['admin']);
}

/**
 * Verifies that the user is a payment validator or admin
 */
export async function verifyPaymentValidator(
  request: NextRequest
): Promise<AuthResult> {
  return verifyUserRole(request, ['payment_validator', 'admin']);
}
