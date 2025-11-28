import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * DTO para ApproveReferralUseCase
 */
export interface ApproveReferralDTO {
  affiliationId: string;
  affiliateUserId: string; // Para validación de ownership
}

/**
 * Respuesta de ApproveReferralUseCase
 */
export interface ApproveReferralResponse {
  affiliation: {
    id: string;
    affiliateId: string;
    referredUserId: string;
    approvalStatus: string;
    approvalFee: string;
    approvedAt: string;
  };
  transaction: {
    id: string;
    type: string;
    amount: string;
    description: string;
  };
  affiliateWallet: {
    id: string;
    previousBalance: string;
    newBalance: string;
  };
  adminWallet: {
    id: string;
    previousBalance: string;
    newBalance: string;
  };
}

/**
 * ApproveReferralUseCase
 *
 * Caso de uso: Aprobar un referido y cobrar fee al afiliado.
 *
 * Flujo:
 * 1. Validar que la afiliación existe y está en estado 'pending'
 * 2. Validar que el usuario que aprueba es el dueño del referral
 * 3. Obtener la configuración activa de approval fee
 * 4. Validar que el afiliado tiene saldo suficiente en su wallet
 * 5. Buscar la wallet del admin (userId con role 'admin')
 * 6. Ejecutar transacción atómica:
 *    - Debitar el approval fee de la wallet del afiliado
 *    - Acreditar el approval fee a la wallet del admin
 *    - Crear registro de Transaction para audit trail
 *    - Actualizar affiliation: approvalStatus = 'approved', approvalFee, approvedAt
 * 7. Retornar detalles de la aprobación
 *
 * Reglas de negocio:
 * - Solo el afiliado dueño del referral puede aprobarlo
 * - Solo referidos con approvalStatus 'pending' pueden ser aprobados
 * - El afiliado debe tener balance >= approvalFee
 * - La transacción debe ser atómica (todo o nada)
 * - Debe existir una configuración activa de approval fee
 * - Debe existir un usuario admin en el sistema
 *
 * Casos de error:
 * - Afiliación no encontrada
 * - Afiliación no está en estado 'pending'
 * - Usuario no es el dueño del referral
 * - No hay configuración activa de approval fee
 * - Saldo insuficiente en wallet del afiliado
 * - Wallet del afiliado no existe
 * - No hay admin en el sistema
 * - Wallet del admin no existe
 *
 * @throws Error con mensaje descriptivo en caso de validación fallida
 *
 * @example
 * const useCase = new ApproveReferralUseCase(prisma);
 * const result = await useCase.execute({
 *   affiliationId: 'aff_123',
 *   affiliateUserId: 'user_456'
 * });
 */
export class ApproveReferralUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(data: ApproveReferralDTO): Promise<ApproveReferralResponse> {
    // IMPORTANTE: Usamos Prisma Interactive Transactions para atomicidad
    // https://www.prisma.io/docs/concepts/components/prisma-client/transactions
    return await this.prisma.$transaction(async (tx) => {
      // 1. Buscar y validar la afiliación
      const affiliation = await tx.affiliation.findUnique({
        where: { id: data.affiliationId },
        include: {
          affiliate: {
            include: { wallet: true },
          },
          referredUser: true,
        },
      });

      if (!affiliation) {
        throw new Error(`Affiliation ${data.affiliationId} not found`);
      }

      // 2. Validar ownership
      if (affiliation.affiliateId !== data.affiliateUserId) {
        throw new Error('You do not have permission to approve this referral');
      }

      // 3. Validar estado pending
      if (affiliation.approvalStatus !== 'pending') {
        throw new Error(
          `Cannot approve referral with status '${affiliation.approvalStatus}'. Only 'pending' referrals can be approved.`
        );
      }

      // 4. Obtener configuración activa de approval fee
      const approvalConfig = await tx.referralApprovalConfig.findFirst({
        where: { isActive: true },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (!approvalConfig) {
        throw new Error('No active referral approval configuration found. Please contact admin.');
      }

      const approvalFee = approvalConfig.approvalFee;

      // 5. Validar que existe wallet del afiliado
      if (!affiliation.affiliate.wallet) {
        throw new Error(`Affiliate wallet not found for user ${data.affiliateUserId}`);
      }

      const affiliateWallet = affiliation.affiliate.wallet;

      // 6. Validar saldo suficiente
      if (affiliateWallet.balance.lessThan(approvalFee)) {
        throw new Error(
          `Insufficient balance. Required: ${approvalFee.toString()} USD, Available: ${affiliateWallet.balance.toString()} USD`
        );
      }

      // 7. Buscar admin user y su wallet
      const adminUser = await tx.user.findFirst({
        where: { role: 'admin' },
        include: { wallet: true },
      });

      if (!adminUser) {
        throw new Error('No admin user found in the system. Please contact support.');
      }

      if (!adminUser.wallet) {
        throw new Error('Admin wallet not found. Please contact support.');
      }

      const adminWallet = adminUser.wallet;

      // 8. Guardar balances previos para respuesta
      const affiliatePreviousBalance = affiliateWallet.balance;
      const adminPreviousBalance = adminWallet.balance;

      // 9. Generar idempotency key para la transacción
      const idempotencyKey = `referral-approval-${data.affiliationId}-${Date.now()}-${uuidv4()}`;

      // 10. Crear registro de Transaction para audit trail
      const transaction = await tx.transaction.create({
        data: {
          type: 'transfer',
          amount: approvalFee,
          sourceWalletId: affiliateWallet.id,
          destinationWalletId: adminWallet.id,
          relatedEntityType: 'ReferralApproval',
          relatedEntityId: data.affiliationId,
          description: `Referral approval fee for ${affiliation.referredUser.name || affiliation.referredUser.email}`,
          idempotencyKey,
          metadata: {
            affiliationId: data.affiliationId,
            affiliateId: affiliation.affiliateId,
            referredUserId: affiliation.referredUserId,
            approvalConfigId: approvalConfig.id,
          },
        },
      });

      // 11. Actualizar wallet del afiliado (débito)
      const updatedAffiliateWallet = await tx.wallet.update({
        where: { id: affiliateWallet.id },
        data: {
          balance: affiliateWallet.balance.minus(approvalFee),
          updatedAt: new Date(),
        },
      });

      // 12. Actualizar wallet del admin (crédito)
      const updatedAdminWallet = await tx.wallet.update({
        where: { id: adminWallet.id },
        data: {
          balance: adminWallet.balance.plus(approvalFee),
          updatedAt: new Date(),
        },
      });

      // 13. Actualizar affiliation con aprobación
      const updatedAffiliation = await tx.affiliation.update({
        where: { id: data.affiliationId },
        data: {
          approvalStatus: 'approved',
          approvalFee,
          approvedAt: new Date(),
          approvalTransactionId: transaction.id,
        },
      });

      // 14. Retornar respuesta con detalles completos
      return {
        affiliation: {
          id: updatedAffiliation.id,
          affiliateId: updatedAffiliation.affiliateId,
          referredUserId: updatedAffiliation.referredUserId,
          approvalStatus: updatedAffiliation.approvalStatus,
          approvalFee: updatedAffiliation.approvalFee?.toString() || '0',
          approvedAt: updatedAffiliation.approvedAt?.toISOString() || '',
        },
        transaction: {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount.toString(),
          description: transaction.description,
        },
        affiliateWallet: {
          id: updatedAffiliateWallet.id,
          previousBalance: affiliatePreviousBalance.toString(),
          newBalance: updatedAffiliateWallet.balance.toString(),
        },
        adminWallet: {
          id: updatedAdminWallet.id,
          previousBalance: adminPreviousBalance.toString(),
          newBalance: updatedAdminWallet.balance.toString(),
        },
      };
    });
  }
}
