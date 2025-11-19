import { Dispute } from '../../domain/entities/Dispute';
import {
  IDisputeRepository,
  DisputeFilters,
} from '../../domain/repositories/IDisputeRepository';

export interface ListDisputesDTO {
  userId: string;
  userRole: string; // 'admin', 'conciliator', 'seller', 'provider'
  filters?: {
    status?: string;
    conciliatorId?: string;
    startDate?: string; // ISO date string
    endDate?: string; // ISO date string
    limit?: number;
    offset?: number;
  };
}

/**
 * ListDisputesUseCase
 *
 * Lista disputas con filtros según el rol del usuario.
 *
 * Permisos por rol:
 * - Admin: Ver todas las disputas del sistema
 * - Conciliator: Ver disputas asignadas + disputas abiertas
 * - Seller: Ver solo sus propias disputas
 * - Provider: Ver solo sus propias disputas
 *
 * @example
 * // Conciliator ve disputas abiertas para asignar
 * const useCase = new ListDisputesUseCase(disputeRepository);
 * const result = await useCase.execute({
 *   userId: 'conciliator123',
 *   userRole: 'conciliator',
 *   filters: { status: 'open' }
 * });
 *
 * // Seller ve sus propias disputas
 * const result = await useCase.execute({
 *   userId: 'seller456',
 *   userRole: 'seller'
 * });
 */
export class ListDisputesUseCase {
  constructor(private disputeRepository: IDisputeRepository) {}

  async execute(data: ListDisputesDTO): Promise<{
    disputes: ReturnType<Dispute['toJSON']>[];
    total: number;
  }> {
    // Construir filtros según el rol
    const filters: DisputeFilters = {
      limit: data.filters?.limit || 20,
      offset: data.filters?.offset || 0,
    };

    // Filtros comunes
    if (data.filters?.status) {
      filters.status = data.filters.status;
    }

    if (data.filters?.startDate) {
      filters.startDate = new Date(data.filters.startDate);
    }

    if (data.filters?.endDate) {
      filters.endDate = new Date(data.filters.endDate);
    }

    // Filtros específicos por rol
    let disputes: Dispute[];

    switch (data.userRole) {
      case 'admin':
        // Admin ve todas las disputas
        disputes = await this.disputeRepository.findAll(filters);
        break;

      case 'conciliator':
        // Conciliator ve:
        // - Disputas asignadas a él (si se especifica filter conciliatorId)
        // - Disputas abiertas para asignar (si status=open)
        // - Todas las disputas asignadas a él (por defecto)
        if (data.filters?.status === 'open') {
          // Ver disputas abiertas para asignar
          filters.status = 'open';
          disputes = await this.disputeRepository.findAll(filters);
        } else {
          // Ver disputas asignadas a este conciliator
          const status = data.filters?.status;
          disputes = await this.disputeRepository.findByConciliator(
            data.userId,
            status
          );
        }
        break;

      case 'seller':
        // Seller solo ve sus propias disputas
        disputes = await this.disputeRepository.findBySeller(data.userId);
        break;

      case 'provider':
        // Provider solo ve sus propias disputas
        disputes = await this.disputeRepository.findByProvider(data.userId);
        break;

      default:
        throw new Error(`Invalid user role: ${data.userRole}`);
    }

    // Contar total (para paginación)
    const total = await this.disputeRepository.count(filters);

    // Retornar resultado
    return {
      disputes: disputes.map((d: Dispute) => d.toJSON()),
      total,
    };
  }
}
