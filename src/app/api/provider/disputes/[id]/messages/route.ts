import { NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';
import { prisma } from '@/infrastructure/database/prisma';
import { PrismaDisputeMessageRepository } from '@/infrastructure/repositories/PrismaDisputeMessageRepository';
import { PrismaDisputeRepository } from '@/infrastructure/repositories/PrismaDisputeRepository';
import { AddDisputeMessageUseCase } from '@/application/use-cases/AddDisputeMessageUseCase';

/**
 * GET /api/provider/disputes/[id]/messages
 *
 * Obtiene los mensajes públicos de una disputa (sin mensajes internos)
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJWT(token);

    // 2. Verificar rol de provider
    if (decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Forbidden. Only providers can access this endpoint.' },
        { status: 403 }
      );
    }

    // 3. Obtener mensajes públicos solamente
    const messageRepository = new PrismaDisputeMessageRepository(prisma);
    const messages = await messageRepository.findByDisputeId(
      params.id,
      false // NO incluir mensajes internos
    );

    const messageCount = await messageRepository.countByDisputeId(
      params.id,
      false
    );

    // 4. Retornar resultado
    return NextResponse.json(
      {
        messages: messages.map((m: any) => m.toJSON()),
        total: messageCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/provider/disputes/[id]/messages] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/provider/disputes/[id]/messages
 *
 * Agrega un mensaje público a la disputa
 *
 * Body:
 * {
 *   message: string (min 5 chars),
 *   attachments?: string[] (URLs)
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJWT(token);

    // 2. Verificar rol de provider
    if (decoded.role !== 'provider') {
      return NextResponse.json(
        { error: 'Forbidden. Only providers can send messages.' },
        { status: 403 }
      );
    }

    // 3. Parsear body
    const body = await request.json();
    const { message, attachments } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    // 4. Ejecutar use case
    const messageRepository = new PrismaDisputeMessageRepository(prisma);
    const disputeRepository = new PrismaDisputeRepository(prisma);

    const useCase = new AddDisputeMessageUseCase(
      messageRepository,
      disputeRepository
    );

    const result = await useCase.execute({
      disputeId: params.id,
      senderId: decoded.userId,
      senderRole: 'provider',
      message,
      isInternal: false, // Provider solo puede crear mensajes públicos
      attachments,
    });

    // 5. Retornar resultado
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/provider/disputes/[id]/messages] Error:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error.message.includes('closed') ||
      error.message.includes('participants')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
