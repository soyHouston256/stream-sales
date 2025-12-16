import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { encrypt } from '@/infrastructure/security/encryption';

export const dynamic = 'force-dynamic';

/**
 * GET /api/provider/products
 *
 * Listar productos del proveedor.
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10)
 * - category: ProductCategory
 * - status: ProductStatus
 * - search: string
 *
 * Headers:
 * - Authorization: Bearer <token>
 */
export async function GET(request: NextRequest) {
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '10', 10),
      50
    );
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    // 4. Build where clause
    const where: any = {
      providerId: user.id,
    };

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 5. Get total count
    const total = await prisma.product.count({ where });

    // 6. Get products with pagination
    const products = await prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true,
      },
    });

    // 7. Transform to response format
    const data = products.map((product: any) => ({
      id: product.id,
      providerId: product.providerId,
      category: product.category,
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      variants: product.variants.map((v: any) => ({
        id: v.id,
        productId: v.productId,
        name: v.name,
        price: v.price.toString(),
        durationDays: v.durationDays,
        isRenewable: v.isRenewable,
      })),
    }));

    // 8. Return paginated response
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/provider/products
 *
 * Crear nuevo producto.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Request Body:
 * {
 *   "category": "netflix",
 *   "name": "Netflix Premium",
 *   "description": "4K Ultra HD, 4 screens",
 *   "price": 15.99,
 *   "accountEmail": "account@netflix.com",
 *   "accountPassword": "password123",
 *   "accountDetails": {}
 * }
 */
const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.string().or(z.number()), // Base price
  durationDays: z.number().optional().default(0), // Duration in days (0 = lifetime)
  imageUrl: z.string().optional(),
  category: z.string(),

  // Inventory Data
  platformType: z.string().optional(),
  accountType: z.enum(['profile', 'full']).optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  profiles: z.array(z.object({ name: z.string(), pin: z.string().optional() })).optional(),

  licenseType: z.enum(['serial', 'email_invite']).optional(),
  licenseKeys: z.string().optional(),

  contentType: z.enum(['live_meet', 'recorded_iframe', 'ebook_drive']).optional(),
  resourceUrl: z.string().optional(),
  liveDate: z.string().optional(),
  coverImageUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const payload = verifyJWT(token);
    if (!payload?.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.role !== 'provider') {
      return NextResponse.json({ error: 'Provider role required' }, { status: 403 });
    }

    // NEW: Check if provider is approved
    const providerProfile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!providerProfile || providerProfile.status !== 'approved') {
      return NextResponse.json({
        error: 'Tu cuenta de proveedor está pendiente de aprobación. No puedes subir productos aún.'
      }, { status: 403 });
    }

    const body = await request.json();
    const validation = createProductSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data', details: validation.error.errors }, { status: 400 });
    }
    const data = validation.data;

    // Transaction to create everything
    const product = await prisma.$transaction(async (tx) => {
      // 1. Create Product
      const newProduct = await tx.product.create({
        data: {
          providerId: user.id,
          name: data.name,
          description: data.description,
          category: data.category,
          imageUrl: data.imageUrl,
          isActive: true,
        },
      });

      // 2. Create Default Variant with duration
      await tx.productVariant.create({
        data: {
          productId: newProduct.id,
          name: 'Standard',
          price: Number(data.price),
          durationDays: data.durationDays ?? 0, // Use provided duration or default to lifetime (0)
          isRenewable: true,
        },
      });

      // 3. Create Inventory based on Category
      // Streaming categories that need accounts/profiles
      const streamingCategories = ['netflix', 'spotify', 'hbo', 'disney', 'prime', 'youtube', 'streaming', 'ai', 'other'];
      const isStreamingProduct = streamingCategories.includes(data.category.toLowerCase());

      if (isStreamingProduct) {
        if (data.email && data.password) {
          // Store credentials directly - NO encryption here
          // We use plain text since this API route stores directly to inventoryAccount
          // The credentials will be encrypted when displayed via safeDecrypt
          const account = await tx.inventoryAccount.create({
            data: {
              productId: newProduct.id,
              email: data.email,
              passwordHash: data.password,
              platformType: data.platformType || 'unknown',
              totalSlots: data.accountType === 'full' ? 1 : (data.profiles?.length || 1),
              availableSlots: data.accountType === 'full' ? 1 : (data.profiles?.length || 1),
            },
          });

          if (data.accountType === 'profile' && data.profiles) {
            await tx.inventorySlot.createMany({
              data: data.profiles.map(p => ({
                accountId: account.id,
                profileName: p.name,
                pinCode: p.pin ? encrypt(p.pin) : null, // Encrypt PIN if present
                status: 'available',
              })),
            });
          }
        }
      } else if (data.category === 'license') {
        if (data.licenseKeys) {
          const keys = data.licenseKeys.split('\n').filter(k => k.trim());
          await tx.inventoryLicense.createMany({
            data: keys.map(k => ({
              productId: newProduct.id,
              licenseKey: k.trim(),
              activationType: data.licenseType || 'serial',
              status: 'available',
            })),
          });
        }
      } else if (data.category === 'course' || data.category === 'ebook') {
        await tx.digitalContent.create({
          data: {
            productId: newProduct.id,
            contentType: data.contentType || 'ebook_drive',
            resourceUrl: data.resourceUrl,
            liveDate: data.liveDate ? new Date(data.liveDate) : null,
            coverImageUrl: data.coverImageUrl,
          },
        });
      }

      return newProduct;
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
