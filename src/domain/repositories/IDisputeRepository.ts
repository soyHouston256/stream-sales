import { Dispute } from '../entities/Dispute';
import { DisputeStatus } from '../value-objects/DisputeStatus';

/**
 * Filtros para búsqueda de disputas
 */
export interface DisputeFilters {
  status?: string; // open, under_review, resolved, closed
  conciliatorId?: string;
  sellerId?: string;
  providerId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * IDisputeRepository
 *
 * Contrato para persistencia de Disputes.
 *
 * IMPORTANTE: Las disputas son entities modificables (no inmutables como purchases)
 * porque pasan por varios estados durante su ciclo de vida.
 */
export interface IDisputeRepository {
  /**
   * Guarda una nueva disputa o actualiza una existente
   *
   * @param dispute - Dispute entity
   * @returns Dispute guardada
   */
  save(dispute: Dispute): Promise<Dispute>;

  /**
   * Busca una disputa por ID
   *
   * @param id - ID de la disputa
   * @returns Dispute o null si no existe
   */
  findById(id: string): Promise<Dispute | null>;

  /**
   * Busca una disputa por Purchase ID
   *
   * Business Rule: Solo puede haber UNA disputa por purchase
   *
   * @param purchaseId - ID de la compra
   * @returns Dispute o null si no existe
   */
  findByPurchaseId(purchaseId: string): Promise<Dispute | null>;

  /**
   * Lista todas las disputas con filtros opcionales
   *
   * Usado por:
   * - Admin: Ver todas las disputas del sistema
   * - Conciliator: Ver disputas para asignar (status: open)
   *
   * @param filters - Filtros opcionales
   * @returns Array de Disputes
   */
  findAll(filters?: DisputeFilters): Promise<Dispute[]>;

  /**
   * Busca disputas asignadas a un conciliator específico
   *
   * @param conciliatorId - ID del conciliator
   * @param status - Filtrar por status (opcional)
   * @returns Array de Disputes
   */
  findByConciliator(
    conciliatorId: string,
    status?: string
  ): Promise<Dispute[]>;

  /**
   * Busca disputas abiertas por un seller
   *
   * @param sellerId - ID del seller
   * @returns Array de Disputes
   */
  findBySeller(sellerId: string): Promise<Dispute[]>;

  /**
   * Busca disputas abiertas contra un provider
   *
   * @param providerId - ID del provider
   * @returns Array de Disputes
   */
  findByProvider(providerId: string): Promise<Dispute[]>;

  /**
   * Cuenta disputas que cumplen los filtros
   *
   * @param filters - Filtros opcionales
   * @returns Número de disputas
   */
  count(filters?: DisputeFilters): Promise<number>;

  /**
   * Obtiene estadísticas de disputas para el conciliator
   *
   * @param conciliatorId - ID del conciliator (opcional, null = todas)
   * @returns Estadísticas agregadas
   */
  getStats(conciliatorId?: string): Promise<{
    total: number;
    open: number;
    underReview: number;
    resolved: number;
    closed: number;
    avgResolutionTimeHours: number;
  }>;
}
