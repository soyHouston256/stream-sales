import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyPaymentValidator } from '@/infrastructure/auth/roleAuth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const transferSchema = z.object({
    commissionAmount: z.number().min(0, 'Commission cannot be negative'),
    paymentMethod: z.string().min(1, 'Payment method is required'),
    holderName: z.string().optional(),
    paymentTime: z.string().optional(),
    voucherUrl: z.string().url().optional().or(z.literal('')),
    paymentDetails: z.string().optional(),
});

/**
 * POST /api/payment-validator/fund/transfer
 *
 * Create a transfer request from validator to admin.
 * Includes all pending fund entries and payment proof.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Body:
 * {
 *   "commissionAmount": 50.00,
 *   "paymentMethod": "bank_transfer",
 *   "holderName": "John Doe",
 *   "paymentTime": "14:30",
 *   "voucherUrl": "https://...",
 *   "paymentDetails": "Additional notes"
 * }
 *
 * Response 201:
 * {
 *   "id": "transfer_123",
 *   "totalAmount": "1500.00",
 *   "commissionAmount": "50.00",
 *   "transferAmount": "1450.00",
 *   "status": "pending",
 *   "entriesIncluded": 10
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Verify user role (payment_validator)
        const auth = await verifyPaymentValidator(request);
        if (!auth.success) {
            return auth.error;
        }

        // 2. Parse and validate request body
        const body = await request.json();
        const validation = transferSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.errors },
                { status: 400 }
            );
        }

        const {
            commissionAmount,
            paymentMethod,
            holderName,
            paymentTime,
            voucherUrl,
            paymentDetails,
        } = validation.data;

        // 3. Get all pending fund entries for this validator
        const pendingEntries = await prisma.validatorFundEntry.findMany({
            where: {
                validatorId: auth.userId,
                status: 'pending',
            },
        });

        if (pendingEntries.length === 0) {
            return NextResponse.json(
                { error: 'No pending funds to transfer' },
                { status: 400 }
            );
        }

        // 4. Calculate total amount
        const totalAmount = pendingEntries.reduce(
            (sum, entry) => sum + Number(entry.amount),
            0
        );

        // 5. Validate commission
        if (commissionAmount > totalAmount) {
            return NextResponse.json(
                { error: 'Commission amount cannot exceed total amount' },
                { status: 400 }
            );
        }

        const transferAmount = totalAmount - commissionAmount;

        // 6. Create transfer in a transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // 6.1. Create the transfer record
            const transfer = await tx.validatorAdminTransfer.create({
                data: {
                    validatorId: auth.userId!,
                    totalAmount: totalAmount,
                    commissionAmount: commissionAmount,
                    transferAmount: transferAmount,
                    paymentMethod: paymentMethod,
                    holderName: holderName || null,
                    paymentTime: paymentTime || null,
                    voucherUrl: voucherUrl || null,
                    paymentDetails: paymentDetails || null,
                    status: 'pending',
                },
            });

            // 6.2. Update all pending entries to reference this transfer
            await tx.validatorFundEntry.updateMany({
                where: {
                    validatorId: auth.userId,
                    status: 'pending',
                },
                data: {
                    transferId: transfer.id,
                    status: 'transferred',
                },
            });

            return transfer;
        });

        // 7. Return success response
        return NextResponse.json(
            {
                id: result.id,
                totalAmount: result.totalAmount.toString(),
                commissionAmount: result.commissionAmount.toString(),
                transferAmount: result.transferAmount.toString(),
                paymentMethod: result.paymentMethod,
                status: result.status,
                entriesIncluded: pendingEntries.length,
                createdAt: result.createdAt.toISOString(),
                message: 'Transfer request created successfully',
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error('Error creating fund transfer:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
