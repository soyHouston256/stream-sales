import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/users/:id
 *
 * Actualizar usuario (solo admin).
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Request Body (all fields optional):
 * {
 *   "name": "New Name",
 *   "role": "seller",
 *   "status": "active"
 * }
 *
 * Response 200:
 * {
 *   "id": "user_123",
 *   "email": "user@example.com",
 *   "name": "New Name",
 *   "role": "seller",
 *   "createdAt": "2025-11-15T10:30:00Z",
 *   "updatedAt": "2025-11-16T14:20:00Z",
 *   "status": "active"
 * }
 *
 * Errors:
 * - 400 Bad Request: Datos inválidos
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de admin
 * - 404 Not Found: Usuario no encontrado
 */
const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z
    .enum(['admin', 'seller', 'affiliate', 'provider', 'conciliator'])
    .optional(),
  status: z.enum(['active', 'suspended']).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verify JWT token
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyJWT(token);

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Verify user has admin role
    const adminUser = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    if (adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // 3. Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 4. Prevent admin from removing their own admin role
    if (params.id === payload.userId) {
      const body = await request.json();
      if (body.role && body.role !== 'admin') {
        return NextResponse.json(
          { error: 'Cannot remove your own admin role' },
          { status: 400 }
        );
      }
    }

    // 5. Validate request body
    const body = await request.json();
    const validationResult = updateUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 6. Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.role && { role: data.role }),
        // Note: status field doesn't exist in User model yet
        // If you add it, uncomment:
        // ...(data.status && { status: data.status }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 7. Return updated user
    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
      status: data.status || 'active', // Return requested status or default
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
