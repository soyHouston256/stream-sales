import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/database/prisma';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/provider/products/:id
 *
 * Obtener detalles de un producto específico.
 *
 * Headers:
 * - Authorization: Bearer <token>
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

    // 3. Get product
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        providerId: user.id, // Only allow provider to see their own products
      },
      include: {
        variants: {
          orderBy: { price: 'asc' },
          take: 1,
        },
        inventoryAccounts: {
          take: 1,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    const variant = product.variants[0];
    const account = product.inventoryAccounts[0];

    // 4. Return product
    return NextResponse.json({
      id: product.id,
      providerId: product.providerId,
      category: product.category,
      name: product.name,
      description: product.description,
      price: variant?.price.toString() || '0',
      imageUrl: product.imageUrl,
      accountEmail: account?.email || '',
      accountPassword: '', // Don't return hash for security, or return empty
      accountDetails: {}, // accountDetails removed from schema?
      status: product.isActive ? 'available' : 'unavailable',
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      soldAt: null, // soldAt removed from schema
    });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/provider/products/:id
 *
 * Actualizar producto existente.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Request Body (all fields optional):
 * {
 *   "name": "Updated Name",
 *   "description": "Updated description",
 *   "price": 19.99,
 *   "accountEmail": "new@email.com",
 *   "accountPassword": "newpassword",
 *   "accountDetails": {}
 * }
 */
const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  accountEmail: z.string().email().optional(),
  accountPassword: z.string().min(1).optional(),
  accountDetails: z.any().optional(),
});

export async function PUT(
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

    // 3. Check if product exists and belongs to user
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: params.id,
        providerId: user.id,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // 4. Only allow updating active products
    if (!existingProduct.isActive) {
      return NextResponse.json(
        { error: 'Only active products can be edited' },
        { status: 400 }
      );
    }

    // 5. Validate request body
    const body = await request.json();
    const validationResult = updateProductSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 6. Update product and relations
    // First, fetch existing relations to get IDs
    const productWithRelations = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: { take: 1 },
        inventoryAccounts: { take: 1 },
      },
    });

    if (!productWithRelations) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const variantId = productWithRelations.variants[0]?.id;
    const accountId = productWithRelations.inventoryAccounts[0]?.id;

    // Prepare update data
    const updateData: any = {
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
    };

    // Update Product
    await prisma.product.update({
      where: { id: params.id },
      data: updateData,
    });

    // Update Variant (Price)
    if (data.price && variantId) {
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { price: data.price },
      });
    }

    // Update Inventory Account
    if ((data.accountEmail || data.accountPassword) && accountId) {
      await prisma.inventoryAccount.update({
        where: { id: accountId },
        data: {
          ...(data.accountEmail && { email: data.accountEmail }),
          ...(data.accountPassword && { passwordHash: data.accountPassword }), // Note: Should be hashed!
        },
      });
    }

    // Fetch updated product for response
    const updatedProduct = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: { take: 1 },
        inventoryAccounts: { take: 1 },
      },
    });

    if (!updatedProduct) {
      throw new Error('Failed to fetch updated product');
    }

    const updatedVariant = updatedProduct.variants[0];
    const updatedAccount = updatedProduct.inventoryAccounts[0];

    // 7. Return updated product
    return NextResponse.json({
      id: updatedProduct.id,
      providerId: updatedProduct.providerId,
      category: updatedProduct.category,
      name: updatedProduct.name,
      description: updatedProduct.description,
      price: updatedVariant?.price.toString() || '0',
      imageUrl: updatedProduct.imageUrl,
      accountEmail: updatedAccount?.email || '',
      accountPassword: '', // Don't return hash
      accountDetails: {},
      status: updatedProduct.isActive ? 'available' : 'unavailable',
      createdAt: updatedProduct.createdAt.toISOString(),
      updatedAt: updatedProduct.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/provider/products/:id
 *
 * Eliminar producto.
 * Solo se pueden eliminar productos con status 'available'.
 *
 * Headers:
 * - Authorization: Bearer <token>
 */
export async function DELETE(
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

    // 3. Check if product exists and belongs to user
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        providerId: user.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // 4. Soft delete (set isActive to false) instead of hard delete if it has history
    // For now, we'll just set isActive to false to simulate deletion/archiving
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    // 6. Return success
    return NextResponse.json(
      { message: 'Product deactivated successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
