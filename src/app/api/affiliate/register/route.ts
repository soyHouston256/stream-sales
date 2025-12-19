import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * POST /api/affiliate/register
 *
 * Apply to become an affiliate.
 * Requires authentication. Creates an AffiliateProfile with "pending" status.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Request Body:
 * {
 *   "applicationNote": "Why I want to be an affiliate..."
 * }
 *
 * Response 201:
 * {
 *   "id": "profile_123",
 *   "referralCode": "AFF-12345",
 *   "status": "pending",
 *   "message": "Application submitted successfully"
 * }
 */

const applicationSchema = z.object({
  applicationNote: z.string().min(10, 'Application note must be at least 10 characters').max(500),
});

function generateReferralCode(): string {
  // Generate a unique referral code: AFF-XXXXX (5 random alphanumeric chars)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'AFF-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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

    // 2. Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        affiliateProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Check if user already has an affiliate profile
    if (user.affiliateProfile) {
      return NextResponse.json(
        {
          error: 'You already have an affiliate profile',
          status: user.affiliateProfile.status,
        },
        { status: 400 }
      );
    }

    // 4. Validate request body
    const body = await request.json();
    const validationResult = applicationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 5. Generate unique referral code
    let referralCode = generateReferralCode();
    let codeExists = await prisma.affiliateProfile.findUnique({
      where: { referralCode },
    });

    // Retry until we get a unique code
    while (codeExists) {
      referralCode = generateReferralCode();
      codeExists = await prisma.affiliateProfile.findUnique({
        where: { referralCode },
      });
    }

    // 6. Create affiliate profile
    const affiliateProfile = await prisma.affiliateProfile.create({
      data: {
        userId: user.id,
        referralCode,
        status: 'pending',
        applicationNote: data.applicationNote,
      },
    });

    // 7. Return created profile
    return NextResponse.json(
      {
        id: affiliateProfile.id,
        referralCode: affiliateProfile.referralCode,
        status: affiliateProfile.status,
        message: 'Application submitted successfully. Please wait for admin approval.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating affiliate application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
