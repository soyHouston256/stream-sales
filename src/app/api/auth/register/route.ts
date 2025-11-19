import { NextRequest, NextResponse } from 'next/server';
import { RegisterUserUseCase } from '@/application/use-cases/RegisterUserUseCase';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { PrismaWalletRepository } from '@/infrastructure/repositories/PrismaWalletRepository';
import { prisma } from '@/infrastructure/database/prisma';
import { JwtService } from '@/infrastructure/auth/JwtService';
import { UserAlreadyExistsException } from '@/domain/exceptions/DomainException';

const userRepository = new PrismaUserRepository();
const walletRepository = new PrismaWalletRepository(prisma);
const registerUserUseCase = new RegisterUserUseCase(userRepository, walletRepository);
const jwtService = new JwtService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = body;

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
      role, // Pass the role to the use case
    });

    const token = jwtService.sign({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });

    // Create response with token and wallet
    const response = NextResponse.json({
      user: result.user,
      wallet: result.wallet,
      token,
    }, { status: 201 });

    // Set cookie on the server side (more reliable than client-side)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);

    response.cookies.set('token', token, {
      httpOnly: false, // Allow JavaScript access for localStorage sync
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expirationDate,
      path: '/',
    });

    return response;

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
