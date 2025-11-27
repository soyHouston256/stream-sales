import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../infrastructure/database/prisma';
import { PrismaWalletRepository } from '../../../../../infrastructure/repositories/PrismaWalletRepository';
import { verifyJWT } from '../../../../../infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/wallets/balance
 *
 * Obtener balance actual de la wallet del usuario autenticado.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "wallet": {
 *     "id": "wl_abc123",
 *     "balance": "1500.5000",
 *     "currency": "USD",
 *     "status": "active",
 *     "updatedAt": "2025-11-15T10:30:00Z"
 *   }
 * }
 *
 * Errors:
 * - 401 Unauthorized: Token inválido o no presente
 * - 404 Not Found: Usuario no tiene wallet
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Extraer y validar JWT token
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    const payload = verifyJWT(token);

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Buscar wallet del usuario
    const walletRepository = new PrismaWalletRepository(prisma);
    const wallet = await walletRepository.findByUserId(payload.userId);

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found. User does not have a wallet yet.' },
        { status: 404 }
      );
    }

    // 3. Retornar wallet data
    return NextResponse.json(
      {
        wallet: wallet.toJSON(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('GET /api/v1/wallets/balance error:', error);

    if (error.message?.includes('jwt')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

