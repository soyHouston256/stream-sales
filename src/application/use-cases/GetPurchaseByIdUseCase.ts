import { IPurchaseRepository } from '../../domain/repositories/IPurchaseRepository';

/**
 * GetPurchaseByIdUseCase
 *
 * Obtiene los detalles de una compra específica por su ID.
 *
 * Casos de uso:
 * - Ver detalles de una compra individual
 * - Verificar status de una transacción
 * - Auditoría de compras
 *
 * Reglas de negocio:
 * - Solo el seller (comprador) puede ver sus propias compras
 * - Admin puede ver todas las compras
 * - Provider puede ver compras de sus productos (TODO: implementar)
 *
 * @example
 * const useCase = new GetPurchaseByIdUseCase(purchaseRepo);
 * const result = await useCase.execute({
 *   purchaseId: 'purchase123',
 *   requestUserId: 'user123'
 * });
 */

export interface GetPurchaseByIdDTO {
  purchaseId: string;
  requestUserId: string; // Usuario que hace la petición (para autorización)
}

export interface GetPurchaseByIdResponse {
  purchase: {
    id: string;
    sellerId: string;
    productId: string;
    amount: string;
    currency: string;
    adminCommission: string;
    providerEarnings: string;
    commissionRate: number;
    commissionPercentage: string;
    createdAt: Date;
    breakdown: {
      totalPaid: string;
      adminCommission: string;
      providerReceived: string;
      commissionRate: number;
    };
  };
}

export class GetPurchaseByIdUseCase {
  // Admin user ID (en producción vendría de configuración)
  private readonly ADMIN_USER_ID = 'admin';

  constructor(private purchaseRepository: IPurchaseRepository) {}

  async execute(data: GetPurchaseByIdDTO): Promise<GetPurchaseByIdResponse> {
    const purchase = await this.purchaseRepository.findById(data.purchaseId);

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    // Autorización: Solo el seller o admin pueden ver la compra
    const isOwner = purchase.isPurchasedBy(data.requestUserId);
    const isAdmin = data.requestUserId === this.ADMIN_USER_ID;

    if (!isOwner && !isAdmin) {
      throw new Error('Unauthorized: You can only view your own purchases');
    }

    return {
      purchase: purchase.toDetailedJSON(),
    };
  }
}
