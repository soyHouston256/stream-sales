import { PrismaClient } from '@prisma/client';

/**
 * DTO para RejectReferralUseCase
 */
export interface RejectReferralDTO {
  affiliationId: string;
  affiliateUserId: string; // Para validación de ownership
  rejectionReason?: string; // Opcional: razón del rechazo
}

/**
 * Respuesta de RejectReferralUseCase
 */
export interface RejectReferralResponse {
  affiliation: {
    id: string;
    affiliateId: string;
    referredUserId: string;
    approvalStatus: string;
    rejectedAt: string;
  };
}

/**
 * RejectReferralUseCase
 *
 * Caso de uso: Rechazar un referido sin cobrar fee.
 *
 * Flujo:
 * 1. Validar que la afiliación existe y está en estado 'pending'
 * 2. Validar que el usuario que rechaza es el dueño del referral
 * 3. Actualizar affiliation: approvalStatus = 'rejected', rejectedAt
 * 4. Retornar detalles del rechazo
 *
 * Reglas de negocio:
 * - Solo el afiliado dueño del referral puede rechazarlo
 * - Solo referidos con approvalStatus 'pending' pueden ser rechazados
 * - El rechazo no genera ninguna transacción financiera
 * - El usuario referido permanece en el sistema pero no se activa la relación de afiliado
 *
 * Casos de error:
 * - Afiliación no encontrada
 * - Afiliación no está en estado 'pending'
 * - Usuario no es el dueño del referral
 *
 * @throws Error con mensaje descriptivo en caso de validación fallida
 *
 * @example
 * const useCase = new RejectReferralUseCase(prisma);
 * const result = await useCase.execute({
 *   affiliationId: 'aff_123',
 *   affiliateUserId: 'user_456',
 *   rejectionReason: 'User does not meet requirements'
 * });
 */
export class RejectReferralUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(data: RejectReferralDTO): Promise<RejectReferralResponse> {
    // 1. Buscar y validar la afiliación
    const affiliation = await this.prisma.affiliation.findUnique({
      where: { id: data.affiliationId },
    });

    if (!affiliation) {
      throw new Error(`Affiliation ${data.affiliationId} not found`);
    }

    // 2. Validar ownership
    if (affiliation.affiliateId !== data.affiliateUserId) {
      throw new Error('You do not have permission to reject this referral');
    }

    // 3. Validar estado pending
    if (affiliation.approvalStatus !== 'pending') {
      throw new Error(
        `Cannot reject referral with status '${affiliation.approvalStatus}'. Only 'pending' referrals can be rejected.`
      );
    }

    // 4. Actualizar affiliation con rechazo
    const updatedAffiliation = await this.prisma.affiliation.update({
      where: { id: data.affiliationId },
      data: {
        approvalStatus: 'rejected',
        rejectedAt: new Date(),
      },
    });

    // 5. Retornar respuesta
    return {
      affiliation: {
        id: updatedAffiliation.id,
        affiliateId: updatedAffiliation.affiliateId,
        referredUserId: updatedAffiliation.referredUserId,
        approvalStatus: updatedAffiliation.approvalStatus,
        rejectedAt: updatedAffiliation.rejectedAt?.toISOString() || '',
      },
    };
  }
}
