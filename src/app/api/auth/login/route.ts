import { NextRequest, NextResponse } from 'next/server';
import { LoginUserUseCase } from '@/application/use-cases/LoginUserUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { JwtService } from '@/infrastructure/auth/JwtService';
import { InvalidCredentialsException } from '@/domain/exceptions/DomainException';

const userRepository = new PrismaUserRepository();
const loginUserUseCase = new LoginUserUseCase(userRepository);
const jwtService = new JwtService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
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

    return NextResponse.json({
      user: result.user,
      token,
    });

  } catch (error) {
    if (error instanceof InvalidCredentialsException) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
