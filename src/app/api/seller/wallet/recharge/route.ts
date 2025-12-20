import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * POST /api/seller/wallet/recharge
 *
 * Solicitar una recarga de billetera.
 * La recarga se crea en estado 'pending' y debe ser aprobada por un administrador.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Request Body:
 * {
 *   "amount": 100.00,
 *   "paymentMethod": "credit_card",
 *   "paymentDetails": "Visa ending in 1234"
 * }
 *
 * Response 201:
 * {
 *   "id": "recharge_123",
 *   "walletId": "wallet_456",
 *   "amount": "100.00",
 *   "paymentMethod": "credit_card",
 *   "paymentGateway": "manual",
 *   "externalTransactionId": null,
 *   "status": "pending",
 *   "createdAt": "2025-11-15T10:30:00Z",
 *   "completedAt": null
 * }
 *
 * Errors:
 * - 400 Bad Request: Datos inválidos
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de seller
 * - 404 Not Found: Usuario no tiene billetera
 */
const rechargeSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum([
    'yape',
    'plin',
    'binance',
    'bank_transfer',
    'credit_card',
    'paypal',
    'crypto',
    'mock',
  ]),
  paymentDetails: z.string().optional(),
  voucherUrl: z.string().url().optional().or(z.literal('')).transform(val => val || undefined),
});


export async function POST(request: NextRequest) {
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

    // 2. Verify user has seller role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'seller') {
      return NextResponse.json(
        { error: 'Access denied. Seller role required.' },
        { status: 403 }
      );
    }

    // 3. Get user's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // 4. Validate request body
    const body = await request.json();
    const validationResult = rechargeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { amount, paymentMethod, paymentDetails, voucherUrl } = validationResult.data;

    // 5. Create recharge request
    const recharge = await prisma.recharge.create({
      data: {
        walletId: wallet.id,
        amount: amount,
        paymentMethod,
        paymentGateway: 'manual', // For now, all recharges are manual/admin-approved
        status: 'pending',
        metadata: {
          ...(paymentDetails && { paymentDetails }),
          ...(voucherUrl && { voucherUrl }),
        },
      },
    });

    // 6. Return recharge
    return NextResponse.json(
      {
        id: recharge.id,
        walletId: recharge.walletId,
        amount: recharge.amount.toString(),
        paymentMethod: recharge.paymentMethod,
        paymentGateway: recharge.paymentGateway,
        externalTransactionId: recharge.externalTransactionId,
        status: recharge.status,
        createdAt: recharge.createdAt.toISOString(),
        completedAt: recharge.completedAt?.toISOString() || null,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating recharge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
