import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../infrastructure/database/prisma';
import { PrismaProductRepository } from '../../../../infrastructure/repositories/PrismaProductRepository';
import { CreateProductUseCase } from '../../../../application/use-cases/CreateProductUseCase';
import { ListProductsUseCase } from '../../../../application/use-cases/ListProductsUseCase';
import { verifyJWT } from '../../../../infrastructure/auth/jwt';
import { getErrorMessage, logError } from '../../../../lib/utils/error-utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/products
 *
 * Crear nuevo producto en el marketplace (solo providers).
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Request Body:
 * {
 *   "category": "netflix",
 *   "price": 15.99,
 *   "currency": "USD",
 *   "accountEmail": "account@netflix.com",
 *   "accountPassword": "plain_password"
 * }
 *
 * Response 201:
 * {
 *   "product": {
 *     "id": "prod_abc123",
 *     "providerId": "user123",
 *     "category": "netflix",
 *     "price": "15.9900",
 *     "currency": "USD",
 *     "accountEmail": "account@netflix.com",
 *     "status": "available",
 *     "createdAt": "2025-11-15T10:30:00Z",
 *     "updatedAt": "2025-11-15T10:30:00Z"
 *   }
 * }
 *
 * Errors:
 * - 400 Bad Request: Datos inválidos
 * - 401 Unauthorized: No autenticado
 * - 403 Forbidden: Usuario no tiene rol de provider
 */

// Validación con Zod
const createProductSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  price: z
    .union([z.number().positive(), z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Must be a positive number')], {
      errorMap: () => ({ message: 'Price must be a positive number' }),
    })
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val)),
  currency: z.string().optional(),
  accountEmail: z.string().email('Invalid email format'),
  accountPassword: z.string().min(1, 'Account password is required'),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Extraer y validar JWT token
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

    // 2. Verificar que el usuario tenga rol de provider
    // TODO: Implementar verificación de rol cuando esté disponible en JWT payload
    // if (payload.role !== 'provider') {
    //   return NextResponse.json(
    //     { error: 'Forbidden: Only providers can create products' },
    //     { status: 403 }
    //   );
    // }

    // 3. Parsear y validar request body
    const body = await request.json();
    const validationResult = createProductSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { category, price, currency, accountEmail, accountPassword } = validationResult.data;

    // 4. Ejecutar CreateProductUseCase
    const productRepository = new PrismaProductRepository(prisma);
    const createProductUseCase = new CreateProductUseCase(productRepository);

    const result = await createProductUseCase.execute({
      providerId: payload.userId,
      category,
      price,
      currency,
      accountEmail,
      accountPassword,
    });

    // 5. Retornar resultado exitoso
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    logError('POST /api/v1/products', error);
    const message = getErrorMessage(error);

    // Manejo de errores específicos
    if (message.includes('jwt') || message.includes('token')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (message.includes('required') || message.includes('positive')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/products
 *
 * Listar productos disponibles en el marketplace.
 *
 * Query Parameters:
 * - category?: string (ej: "netflix")
 * - minPrice?: number
 * - maxPrice?: number
 * - limit?: number (default: 20)
 * - offset?: number (default: 0)
 *
 * Response 200:
 * {
 *   "products": [
 *     {
 *       "id": "prod_abc123",
 *       "providerId": "user123",
 *       "category": "netflix",
 *       "price": "15.9900",
 *       "currency": "USD",
 *       "accountEmail": "account@netflix.com",
 *       "status": "available",
 *       "createdAt": "2025-11-15T10:30:00Z",
 *       "updatedAt": "2025-11-15T10:30:00Z"
 *     }
 *   ],
 *   "total": 10,
 *   "hasMore": true
 * }
 *
 * IMPORTANTE: accountPassword NO se incluye en la respuesta
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Extraer query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const minPriceStr = searchParams.get('minPrice');
    const maxPriceStr = searchParams.get('maxPrice');
    const limitStr = searchParams.get('limit');
    const offsetStr = searchParams.get('offset');

    // 2. Parsear a números (con validación)
    const minPrice = minPriceStr ? parseFloat(minPriceStr) : undefined;
    const maxPrice = maxPriceStr ? parseFloat(maxPriceStr) : undefined;
    const limit = limitStr ? parseInt(limitStr) : undefined;
    const offset = offsetStr ? parseInt(offsetStr) : undefined;

    // 3. Validar que los números sean válidos
    if (minPrice !== undefined && isNaN(minPrice)) {
      return NextResponse.json({ error: 'Invalid minPrice parameter' }, { status: 400 });
    }
    if (maxPrice !== undefined && isNaN(maxPrice)) {
      return NextResponse.json({ error: 'Invalid maxPrice parameter' }, { status: 400 });
    }
    if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
      return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
    }
    if (offset !== undefined && (isNaN(offset) || offset < 0)) {
      return NextResponse.json({ error: 'Invalid offset parameter' }, { status: 400 });
    }

    // 4. Ejecutar ListProductsUseCase
    const productRepository = new PrismaProductRepository(prisma);
    const listProductsUseCase = new ListProductsUseCase(productRepository);

    const result = await listProductsUseCase.execute({
      category,
      minPrice,
      maxPrice,
      limit,
      offset,
    });

    // 5. Retornar resultado
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    logError('GET /api/v1/products', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
