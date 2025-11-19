import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

/**
 * POST /api/provider/earnings/withdraw
 *
 * Crear solicitud de retiro de ganancias.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Request Body:
 * {
 *   "amount": 500.00,
 *   "paymentMethod": "paypal" | "bank_transfer" | "crypto",
 *   "paymentDetails": "provider@paypal.com"
 * }
 *
 * Response 201:
 * {
 *   "id": "withdrawal_123",
 *   "walletId": "wallet_456",
 *   "amount": "500.00",
 *   "paymentMethod": "paypal",
 *   "paymentDetails": "provider@paypal.com",
 *   "status": "pending",
 *   "requestedAt": "2025-11-18T10:30:00Z"
 * }
 *
 * Note: This is a placeholder endpoint. The withdrawals table doesn't exist yet.
 * TODO: Create Withdrawal model and implement withdrawal system with admin approval
 */

const withdrawalSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['paypal', 'bank_transfer', 'crypto']),
  paymentDetails: z.string().min(3, 'Payment details required'),
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

    // 2. Verify user has provider role
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'provider') {
      return NextResponse.json(
        { error: 'Access denied. Provider role required.' },
        { status: 403 }
      );
    }

    // 3. Validate request body
    const body = await request.json();
    const validationResult = withdrawalSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { amount, paymentMethod, paymentDetails } = validationResult.data;

    // 4. Get provider's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // 5. Verify sufficient balance
    const currentBalance = wallet.balance.toNumber();
    if (currentBalance < amount) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          details: `Available: $${currentBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // 6. Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        walletId: wallet.id,
        amount,
        paymentMethod,
        paymentDetails,
        status: 'pending',
      },
    });

    console.log('[WITHDRAWAL] Request created:', {
      id: withdrawal.id,
      userId: user.id,
      walletId: wallet.id,
      amount,
      paymentMethod,
      currentBalance,
    });

    // 7. Return created withdrawal
    return NextResponse.json(
      {
        id: withdrawal.id,
        walletId: withdrawal.walletId,
        amount: withdrawal.amount.toString(),
        paymentMethod: withdrawal.paymentMethod,
        paymentDetails: withdrawal.paymentDetails,
        status: withdrawal.status,
        notes: withdrawal.notes,
        requestedAt: withdrawal.requestedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating withdrawal request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
