import { NextRequest, NextResponse } from 'next/server';
import { GetUserByIdUseCase } from '@/application/use-cases/GetUserByIdUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { getUserFromRequest } from '@/infrastructure/auth/middleware';
import { UserNotFoundException } from '@/domain/exceptions/DomainException';

const userRepository = new PrismaUserRepository();
const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await getUserByIdUseCase.execute(user.userId);

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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
