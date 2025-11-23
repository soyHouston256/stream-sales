import { NextRequest, NextResponse } from 'next/server';
import { GetUserByIdUseCase } from '@/application/use-cases/GetUserByIdUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { JwtService } from '@/infrastructure/auth/JwtService';
import { UserNotFoundException } from '@/domain/exceptions/DomainException';

export const dynamic = 'force-dynamic';

const userRepository = new PrismaUserRepository();
const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
const jwtService = new JwtService();

export async function GET(request: NextRequest) {
  try {
    // Validate JWT token from Authorization header
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
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
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
