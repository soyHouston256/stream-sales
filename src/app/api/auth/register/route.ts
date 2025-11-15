import { NextRequest, NextResponse } from 'next/server';
import { RegisterUserUseCase } from '@/application/use-cases/RegisterUserUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { JwtService } from '@/infrastructure/auth/JwtService';
import { UserAlreadyExistsException } from '@/domain/exceptions/DomainException';

const userRepository = new PrismaUserRepository();
const registerUserUseCase = new RegisterUserUseCase(userRepository);
const jwtService = new JwtService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await registerUserUseCase.execute({
      email,
      password,
      name,
    });

    const token = jwtService.sign({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });

    return NextResponse.json({
      user: result.user,
      token,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof UserAlreadyExistsException) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
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
