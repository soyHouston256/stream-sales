import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { Decimal } from '@prisma/client/runtime/library';
import crypto from 'crypto';

/**
 * PUT /api/admin/recharges/:id/approve
 *
 * Approve a pending recharge request.
 * This will:
 * 1. Update the wallet balance
 * 2. Create a credit transaction
 * 3. Update the recharge status to 'completed'
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body (optional):
 * {
 *   "externalTransactionId": "stripe_tx_123" // Optional external reference
 * }
 *
 * Response 200:
 * {
 *   "id": "recharge_123",
 *   "walletId": "wallet_456",
 *   "amount": "100.00",
 *   "status": "completed",
 *   "completedAt": "2025-11-16T10:30:00Z",
 *   "transaction": {
 *     "id": "trans_789",
 *     "type": "credit",
 *     "amount": "100.00"
 *   },
 *   "newWalletBalance": "350.00",
 *   "message": "Recharge approved successfully"
 * }
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verify JWT token and admin role
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

    // 2. Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse optional request body
    let externalTransactionId: string | null = null;
    try {
      const body = await request.json();
      externalTransactionId = body.externalTransactionId || null;
    } catch {
      // No body or invalid JSON, continue without external ID
    }

    // 4. Find the recharge
    const recharge = await prisma.recharge.findUnique({
      where: { id: params.id },
      include: {
        wallet: true,
      },
    });

    if (!recharge) {
      return NextResponse.json(
        { error: 'Recharge request not found' },
        { status: 404 }
      );
    }

    // 5. Check if recharge is pending
    if (recharge.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot approve recharge with status: ${recharge.status}` },
        { status: 400 }
      );
    }

    // 6. Check wallet status
    if (recharge.wallet.status !== 'active') {
      return NextResponse.json(
        { error: `Wallet is ${recharge.wallet.status}. Cannot process recharge.` },
        { status: 400 }
      );
    }

    // 7. Generate idempotency key for transaction
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`recharge-${params.id}-${Date.now()}`)
      .digest('hex');

    // 8. Process recharge in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 8.1. Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: recharge.walletId },
        data: {
          balance: {
            increment: recharge.amount,
          },
        },
      });

      // 8.2. Create credit transaction
      const transaction = await tx.transaction.create({
        data: {
          type: 'credit',
          amount: recharge.amount,
          destinationWalletId: recharge.walletId,
          relatedEntityType: 'Recharge',
          relatedEntityId: recharge.id,
          description: `Wallet recharge via ${recharge.paymentMethod}`,
          metadata: {
            paymentMethod: recharge.paymentMethod,
            paymentGateway: recharge.paymentGateway,
            approvedBy: payload.userId,
            externalTransactionId: externalTransactionId,
          },
          idempotencyKey,
        },
      });

      // 8.3. Update recharge status
      const updatedRecharge = await tx.recharge.update({
        where: { id: params.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          externalTransactionId: externalTransactionId || recharge.externalTransactionId,
          metadata: {
            ...((recharge.metadata as any) || {}),
            approvedBy: payload.userId,
            approvedAt: new Date().toISOString(),
            transactionId: transaction.id,
          },
        },
      });

      return {
        recharge: updatedRecharge,
        transaction,
        wallet: updatedWallet,
      };
    });

    // 9. Return success response
    return NextResponse.json({
      id: result.recharge.id,
      walletId: result.recharge.walletId,
      amount: result.recharge.amount.toString(),
      paymentMethod: result.recharge.paymentMethod,
      status: result.recharge.status,
      createdAt: result.recharge.createdAt.toISOString(),
      completedAt: result.recharge.completedAt?.toISOString(),
      externalTransactionId: result.recharge.externalTransactionId,
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        amount: result.transaction.amount.toString(),
        createdAt: result.transaction.createdAt.toISOString(),
      },
      newWalletBalance: result.wallet.balance.toString(),
      message: 'Recharge approved successfully',
    });
  } catch (error: any) {
    console.error('Error approving recharge:', error);

    // Check for idempotency key conflict
    if (error.code === 'P2002' && error.meta?.target?.includes('idempotencyKey')) {
      return NextResponse.json(
        { error: 'This recharge has already been processed' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
