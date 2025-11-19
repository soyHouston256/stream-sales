import { IPurchaseRepository } from '../../domain/repositories/IPurchaseRepository';

/**
 * ListMyPurchasesUseCase
 *
 * Lista todas las compras realizadas por un usuario.
 *
 * Features:
 * - Paginación (limit, offset)
 * - Filtro por rango de fechas
 * - Ordenado por fecha descendente (más recientes primero)
 * - Incluye total de compras y si hay más páginas
 *
 * Casos de uso:
 * - Dashboard de seller: ver historial de compras
 * - Exportar compras a CSV/PDF
 * - Análisis de gastos del usuario
 *
 * @example
 * const useCase = new ListMyPurchasesUseCase(purchaseRepo);
 * const result = await useCase.execute({
 *   sellerId: 'user123',
 *   limit: 10,
 *   offset: 0
 * });
 */

export interface ListMyPurchasesDTO {
  sellerId: string; // Usuario que hizo las compras
  limit?: number; // Default: 20
  offset?: number; // Default: 0
  startDate?: Date; // Filtrar desde esta fecha
  endDate?: Date; // Filtrar hasta esta fecha
}

export interface ListMyPurchasesResponse {
  purchases: Array<{
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
  }>;
  pagination: {
    total: number; // Total de compras del usuario
    limit: number; // Items por página
    offset: number; // Offset actual
    hasMore: boolean; // Si hay más páginas
  };
  summary: {
    totalSpent: number; // Total gastado por el usuario
    totalPurchases: number; // Número total de compras
  };
}

export class ListMyPurchasesUseCase {
  private readonly DEFAULT_LIMIT = 20;
  private readonly DEFAULT_OFFSET = 0;

  constructor(private purchaseRepository: IPurchaseRepository) {}

  async execute(data: ListMyPurchasesDTO): Promise<ListMyPurchasesResponse> {
    const limit = data.limit || this.DEFAULT_LIMIT;
    const offset = data.offset || this.DEFAULT_OFFSET;

    // Obtener compras con filtros
    const purchases = await this.purchaseRepository.findBySellerId(
      data.sellerId,
      {
        limit,
        offset,
        startDate: data.startDate,
        endDate: data.endDate,
      }
    );

    // Obtener total de compras (para paginación)
    const totalCount = await this.purchaseRepository.countBySellerId(
      data.sellerId
    );

    // Calcular total gastado
    const totalSpent = await this.purchaseRepository.getTotalSpentBySeller(
      data.sellerId
    );

    // Calcular si hay más páginas
    const hasMore = offset + purchases.length < totalCount;

    return {
      purchases: purchases.map((p) => p.toJSON()),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore,
      },
      summary: {
        totalSpent,
        totalPurchases: totalCount,
      },
    };
  }
}
