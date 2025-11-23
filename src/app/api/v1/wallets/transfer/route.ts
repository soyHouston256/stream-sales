import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../../infrastructure/database/prisma';
import { PrismaWalletRepository } from '../../../../../infrastructure/repositories/PrismaWalletRepository';
import { TransferMoneyUseCase } from '../../../../../application/use-cases/TransferMoneyUseCase';
import { InsufficientBalanceException } from '../../../../../domain/exceptions/InsufficientBalanceException';
import { verifyJWT } from '../../../../../infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/wallets/transfer
 *
 * Transferir dinero P2P entre usuarios (solo para usuarios con rol affiliate).
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Request Body:
 * {
 *   "toUserId": "cm1xyz789",
 *   "amount": "25.50",
 *   "description": "Pago por servicio"
 * }
 *
 * Response 200:
 * {
 *   "transfer": {
 *     "fromUserId": "cm1abc123",
 *     "toUserId": "cm1xyz789",
 *     "amount": "25.5000",
 *     "currency": "USD",
 *     "description": "Pago por servicio"
 *   },
 *   "senderWallet": {
 *     "id": "wl_abc123",
 *     "userId": "cm1abc123",
 *     "previousBalance": "100.0000",
 *     "newBalance": "74.5000"
 *   },
 *   "receiverWallet": {
 *     "id": "wl_xyz789",
 *     "userId": "cm1xyz789",
 *     "previousBalance": "50.0000",
 *     "newBalance": "75.5000"
 *   }
 * }
 *
 * Errors:
 * - 400 Bad Request: Datos inválidos
 * - 401 Unauthorized: No autenticado
 * - 402 Payment Required: Saldo insuficiente
 * - 403 Forbidden: Usuario no tiene rol de affiliate (opcional - por ahora permitir a todos)
 * - 404 Not Found: Usuario destino no encontrado
 */

// Validación con Zod
const transferSchema = z.object({
  toUserId: z.string().min(1, 'toUserId is required'),
  amount: z
    .union([z.number().positive(), z.string().regex(/^\d+(\.\d+)?$/)], {
      errorMap: () => ({ message: 'Amount must be a positive number' }),
    })
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val)),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Extraer y validar JWT token
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

    // 2. Parsear y validar request body
    const body = await request.json();
    const validationResult = transferSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { toUserId, amount, description } = validationResult.data;

    // 3. Ejecutar TransferMoneyUseCase
    const walletRepository = new PrismaWalletRepository(prisma);
    const transferUseCase = new TransferMoneyUseCase(walletRepository);

    const result = await transferUseCase.execute({
      fromUserId: payload.userId,
      toUserId,
      amount,
      description,
    });

    // 4. Retornar resultado exitoso
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('POST /api/v1/wallets/transfer error:', error);

    // Manejo de errores específicos
    if (error.message?.includes('jwt') || error.message?.includes('token')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (error instanceof InsufficientBalanceException) {
      return NextResponse.json({ error: error.message }, { status: 402 }); // Payment Required
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error.message?.includes('yourself') ||
      error.message?.includes('Currency mismatch')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
