import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../../infrastructure/database/prisma';
import { PrismaProductRepository } from '../../../../../infrastructure/repositories/PrismaProductRepository';
import { UpdateProductUseCase } from '../../../../../application/use-cases/UpdateProductUseCase';
import { DeleteProductUseCase } from '../../../../../application/use-cases/DeleteProductUseCase';
import { verifyJWT } from '../../../../../infrastructure/auth/jwt';
import { getErrorMessage, logError } from '../../../../../lib/utils/error-utils';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/v1/products/:id
 *
 * Actualizar producto existente (solo owner).
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Request Body (todos los campos opcionales):
 * {
 *   "category"?: "spotify",
 *   "price"?: 12.99,
 *   "currency"?: "EUR",
 *   "accountEmail"?: "new@spotify.com",
 *   "accountPassword"?: "new_password"
 * }
 *
 * Response 200:
 * {
 *   "product": {
 *     "id": "prod_abc123",
 *     "providerId": "user123",
 *     "category": "spotify",
 *     "price": "12.9900",
 *     "currency": "EUR",
 *     "accountEmail": "new@spotify.com",
 *     "status": "available",
 *     "updatedAt": "2025-11-15T11:00:00Z"
 *   }
 * }
 *
 * Errors:
 * - 400 Bad Request: Datos inválidos
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: No es el owner del producto
 * - 404 Not Found: Producto no encontrado
 */

// Validación con Zod para update (todos los campos opcionales)
const updateProductSchema = z.object({
  category: z.string().min(1).optional(),
  price: z
    .union([z.number().positive(), z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Must be a positive number')], {
      errorMap: () => ({ message: 'Price must be a positive number' }),
    })
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .optional(),
  currency: z.string().optional(),
  accountEmail: z.string().email('Invalid email format').optional(),
  accountPassword: z.string().min(1).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Extraer product ID de los params
    const productId = params.id;

    // 2. Extraer y validar JWT token
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

    // 3. Parsear y validar request body
    const body = await request.json();
    const validationResult = updateProductSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // 4. Ejecutar UpdateProductUseCase
    const productRepository = new PrismaProductRepository(prisma);
    const updateProductUseCase = new UpdateProductUseCase(productRepository);

    const result = await updateProductUseCase.execute({
      productId,
      providerId: payload.userId,
      ...updateData,
    });

    // 5. Retornar resultado exitoso
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    logError('PUT /api/v1/products/:id', error);
    const message = getErrorMessage(error);

    // Manejo de errores específicos
    if (message.includes('jwt') || message.includes('token')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (
      message.includes('Cannot edit') ||
      message.includes('positive') ||
      message.includes('required')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/products/:id
 *
 * Eliminar producto del marketplace (solo owner).
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Product prod_abc123 deleted successfully"
 * }
 *
 * Errors:
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: No es el owner del producto
 * - 404 Not Found: Producto no encontrado
 * - 400 Bad Request: No se puede eliminar (ej: producto vendido)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Extraer product ID de los params
    const productId = params.id;

    // 2. Extraer y validar JWT token
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

    // 3. Ejecutar DeleteProductUseCase
    const productRepository = new PrismaProductRepository(prisma);
    const deleteProductUseCase = new DeleteProductUseCase(productRepository);

    const result = await deleteProductUseCase.execute({
      productId,
      providerId: payload.userId,
    });

    // 4. Retornar resultado exitoso
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    logError('DELETE /api/v1/products/:id', error);
    const message = getErrorMessage(error);

    // Manejo de errores específicos
    if (message.includes('jwt') || message.includes('token')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (message.includes('Cannot delete')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

