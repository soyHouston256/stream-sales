import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import prisma from '@/infrastructure/database/prisma';
import { PrismaDisputeRepository } from '@/infrastructure/repositories/PrismaDisputeRepository';
import { ListDisputesUseCase } from '@/application/use-cases/ListDisputesUseCase';

/**
 * GET /api/seller/disputes
 *
 * Lista todas las disputas del seller actual
 */
export async function GET(request: Request) {
  try {
    // 1. Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJWT(token);

    // 2. Verificar rol de seller
    if (decoded.role !== 'seller') {
      return NextResponse.json(
        { error: 'Forbidden. Only sellers can access this endpoint.' },
        { status: 403 }
      );
    }

    // 3. Ejecutar use case
    const disputeRepository = new PrismaDisputeRepository(prisma);
    const listDisputesUseCase = new ListDisputesUseCase(disputeRepository);

    const result = await listDisputesUseCase.execute({
      userId: decoded.userId,
      userRole: 'seller',
    });

    // 4. Retornar resultado
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[GET /api/seller/disputes] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
