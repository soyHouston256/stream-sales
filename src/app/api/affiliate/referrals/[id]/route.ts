import { NextRequest, NextResponse } from 'next/server';
import { prisma as globalPrisma } from '@/infrastructure/database/prisma';
import { PrismaClient } from '@prisma/client';
import { verifyJWT } from '@/infrastructure/auth/jwt';

// Define minimal Delegate interfaces to fix type resolution
interface OrderDelegate {
  findMany(args?: { where?: any }): Promise<any[]>;
}

interface OrderItemDelegate {
  findMany(args?: { where?: any }): Promise<any[]>;
}

// Force type recognition
const prisma = globalPrisma as unknown as PrismaClient & {
  order: OrderDelegate;
  orderItem: OrderItemDelegate;
};

export const dynamic = 'force-dynamic';

/**
 * GET /api/affiliate/referrals/:id
 *
 * Get detailed information about a specific referral.
 * Requires authentication and affiliate profile.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "id": "aff_123",
 *   "affiliateId": "user_456",
 *   "referredUserId": "user_789",
 *   "referredUser": {
 *     "id": "user_789",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "role": "seller"
 *   },
 *   "status": "active",
 *   "commissionPaid": true,
 *   "commissionAmount": "10.00",
 *   "totalCommissionEarned": "50.00",
 *   "createdAt": "2025-11-15T10:30:00Z",
 *   "activitySummary": {
 *     "totalPurchases": 5,
 *     "totalProducts": 0,
 *     "totalSales": 0
 *   },
 *   "commissionTimeline": []
 * }
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 2. Check affiliate profile exists
    const affiliateProfile = await prisma.affiliateProfile.findUnique({
      where: { userId: payload.userId },
    });

    if (!affiliateProfile) {
      return NextResponse.json(
        { error: 'No affiliate profile found' },
        { status: 404 }
      );
    }

    // 3. Get affiliation with referred user data
    const affiliation = await prisma.affiliation.findFirst({
      where: {
        id: params.id,
        affiliateId: payload.userId, // Ensure it belongs to this affiliate
      },
      include: {
        referredUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!affiliation) {
      return NextResponse.json(
        { error: 'Referral not found or access denied' },
        { status: 404 }
      );
    }

    // 4. Get activity summary based on user role
    const activitySummary: any = {};

    if (affiliation.referredUser.role === 'seller') {
      // Count purchases (orders) made by this seller
      const orders = await prisma.order.findMany({
        where: { userId: affiliation.referredUserId },
      });
      activitySummary.totalPurchases = orders.length;
    }

    if (affiliation.referredUser.role === 'provider') {
      // Count products and sales
      const products = await prisma.product.findMany({
        where: { providerId: affiliation.referredUserId },
      });

      // Count sales (order items for this provider's products)
      const sales = await prisma.orderItem.findMany({
        where: {
          variant: {
            product: {
              providerId: affiliation.referredUserId
            }
          },
          order: {
            status: 'paid'
          }
        }
      });

      activitySummary.totalProducts = products.length;
      activitySummary.totalSales = sales.length;
    }

    // 5. Get commission timeline (placeholder - would come from commissions table)
    const commissionTimeline: any[] = [];
    // TODO: Implement when commission tracking table is created

    // 6. Return detailed referral info
    return NextResponse.json({
      id: affiliation.id,
      affiliateId: affiliation.affiliateId,
      referredUserId: affiliation.referredUserId,
      referredUser: {
        id: affiliation.referredUser.id,
        name: affiliation.referredUser.name || 'Unknown',
        email: affiliation.referredUser.email,
        role: affiliation.referredUser.role,
      },
      status: affiliation.status,
      approvalStatus: affiliation.approvalStatus,
      approvalFee: affiliation.approvalFee?.toString() || null,
      approvedAt: affiliation.approvedAt?.toISOString() || null,
      rejectedAt: affiliation.rejectedAt?.toISOString() || null,
      commissionPaid: affiliation.commissionPaid,
      commissionAmount: affiliation.commissionAmount?.toString() || '0.00',
      totalCommissionEarned: affiliation.commissionAmount?.toString() || '0.00',
      createdAt: affiliation.createdAt.toISOString(),
      activitySummary,
      commissionTimeline,
    });
  } catch (error: unknown) {
    console.error('Error fetching referral details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
