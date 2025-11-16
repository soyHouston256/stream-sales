import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

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
    });

    // 7. Transform to response format
    const data = products.map((product) => ({
      id: product.id,
      providerId: product.providerId,
      category: product.category,
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      accountEmail: product.accountEmail,
      accountPassword: product.accountPassword,
      accountDetails: product.accountDetails,
      status: product.status,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      soldAt: product.soldAt?.toISOString(),
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
  category: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().positive('Price must be positive'),
  accountEmail: z.string().email('Invalid email format'),
  accountPassword: z.string().min(1, 'Account password is required'),
  accountDetails: z.any().optional(),
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
    const validationResult = createProductSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 4. Create product
    const product = await prisma.product.create({
      data: {
        providerId: user.id,
        category: data.category,
        name: data.name,
        description: data.description,
        price: data.price,
        accountEmail: data.accountEmail,
        accountPassword: data.accountPassword, // TODO: Encrypt in production
        accountDetails: data.accountDetails || null,
        status: 'available',
      },
    });

    // 5. Return created product
    return NextResponse.json(
      {
        id: product.id,
        providerId: product.providerId,
        category: product.category,
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        accountEmail: product.accountEmail,
        accountPassword: product.accountPassword,
        accountDetails: product.accountDetails,
        status: product.status,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
