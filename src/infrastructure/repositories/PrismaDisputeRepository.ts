import { PrismaClient } from '@prisma/client';
import { Dispute } from '../../domain/entities/Dispute';
import {
  IDisputeRepository,
  DisputeFilters,
} from '../../domain/repositories/IDisputeRepository';
import { DisputeStatus } from '../../domain/value-objects/DisputeStatus';
import { ResolutionType } from '../../domain/value-objects/ResolutionType';

/**
 * PrismaDisputeRepository
 *
 * Implementación concreta de IDisputeRepository usando Prisma ORM.
 *
 * Conversiones importantes:
 * - DisputeStatus: Value Object <-> string
 * - ResolutionType: Value Object <-> string (nullable)
 * - Dates: Prisma maneja automáticamente
 *
 * IMPORTANTE: A diferencia de Purchase (inmutable), Dispute se ACTUALIZA
 * a medida que progresa por los estados (assign, resolve, close).
 */
export class PrismaDisputeRepository implements IDisputeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Guarda o actualiza una disputa
   *
   * Usa upsert de Prisma para manejar tanto create como update
   */
  async save(dispute: Dispute): Promise<Dispute> {
    const data = dispute.toPersistence();

    const saved = await this.prisma.dispute.upsert({
      where: { id: dispute.id },
      create: data,
      update: {
        conciliatorId: data.conciliatorId,
        status: data.status,
        resolution: data.resolution,
        resolutionType: data.resolutionType,
        assignedAt: data.assignedAt,
        resolvedAt: data.resolvedAt,
      },
      include: {
        purchase: true,
        seller: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        conciliator: { select: { id: true, name: true, email: true } },
      },
    });

    return this.toDomain(saved);
  }

  /**
   * Busca disputa por ID
   */
  async findById(id: string): Promise<Dispute | null> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        purchase: true,
        seller: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        conciliator: { select: { id: true, name: true, email: true } },
      },
    });

    return dispute ? this.toDomain(dispute) : null;
  }

  /**
   * Busca disputa por Purchase ID
   */
  async findByPurchaseId(purchaseId: string): Promise<Dispute | null> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { purchaseId },
      include: {
        purchase: true,
        seller: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        conciliator: { select: { id: true, name: true, email: true } },
      },
    });

    return dispute ? this.toDomain(dispute) : null;
  }

  /**
   * Lista disputas con filtros
   */
  async findAll(filters?: DisputeFilters): Promise<Dispute[]> {
    const where = this.buildWhereClause(filters);

    const disputes = await this.prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters?.offset || 0,
      take: filters?.limit || 20,
      include: {
        purchase: true,
        seller: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        conciliator: { select: { id: true, name: true, email: true } },
      },
    });

    return disputes.map((d: any) => this.toDomain(d));
  }

  /**
   * Busca disputas asignadas a un conciliator
   */
  async findByConciliator(
    conciliatorId: string,
    status?: string
  ): Promise<Dispute[]> {
    const where: any = { conciliatorId };

    if (status) {
      where.status = status;
    }

    const disputes = await this.prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        purchase: true,
        seller: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        conciliator: { select: { id: true, name: true, email: true } },
      },
    });

    return disputes.map((d: any) => this.toDomain(d));
  }

  /**
   * Busca disputas del seller
   */
  async findBySeller(sellerId: string): Promise<Dispute[]> {
    const disputes = await this.prisma.dispute.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        purchase: true,
        seller: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        conciliator: { select: { id: true, name: true, email: true } },
      },
    });

    return disputes.map((d: any) => this.toDomain(d));
  }

  /**
   * Busca disputas del provider
   */
  async findByProvider(providerId: string): Promise<Dispute[]> {
    const disputes = await this.prisma.dispute.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      include: {
        purchase: true,
        seller: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        conciliator: { select: { id: true, name: true, email: true } },
      },
    });

    return disputes.map((d: any) => this.toDomain(d));
  }

  /**
   * Cuenta disputas con filtros
   */
  async count(filters?: DisputeFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.dispute.count({ where });
  }

  /**
   * Obtiene estadísticas de disputas
   */
  async getStats(conciliatorId?: string): Promise<{
    total: number;
    open: number;
    underReview: number;
    resolved: number;
    closed: number;
    avgResolutionTimeHours: number;
  }> {
    const where: any = conciliatorId ? { conciliatorId } : {};

    const [total, open, underReview, resolved, closed, resolvedDisputes] =
      await Promise.all([
        this.prisma.dispute.count({ where }),
        this.prisma.dispute.count({ where: { ...where, status: 'open' } }),
        this.prisma.dispute.count({
          where: { ...where, status: 'under_review' },
        }),
        this.prisma.dispute.count({ where: { ...where, status: 'resolved' } }),
        this.prisma.dispute.count({ where: { ...where, status: 'closed' } }),
        this.prisma.dispute.findMany({
          where: {
            ...where,
            status: { in: ['resolved', 'closed'] },
            assignedAt: { not: null },
            resolvedAt: { not: null },
          },
          select: { assignedAt: true, resolvedAt: true },
        }),
      ]);

    // Calcular tiempo promedio de resolución
    let avgResolutionTimeHours = 0;
    if (resolvedDisputes.length > 0) {
      const totalHours = resolvedDisputes.reduce((sum: number, d: any) => {
        if (d.assignedAt && d.resolvedAt) {
          const hours =
            (d.resolvedAt.getTime() - d.assignedAt.getTime()) /
            (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);

      avgResolutionTimeHours = Math.round(totalHours / resolvedDisputes.length);
    }

    return {
      total,
      open,
      underReview,
      resolved,
      closed,
      avgResolutionTimeHours,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Construye la cláusula WHERE de Prisma desde filtros
   */
  private buildWhereClause(filters?: DisputeFilters): any {
    if (!filters) return {};

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.conciliatorId) {
      where.conciliatorId = filters.conciliatorId;
    }

    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }

    if (filters.providerId) {
      where.providerId = filters.providerId;
    }

    // Filtro de fechas
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return where;
  }

  /**
   * Convierte de Prisma model a Domain entity
   */
  private toDomain(prismaDispute: any): Dispute {
    return Dispute.fromPersistence({
      id: prismaDispute.id,
      purchaseId: prismaDispute.purchaseId,
      sellerId: prismaDispute.sellerId,
      providerId: prismaDispute.providerId,
      conciliatorId: prismaDispute.conciliatorId,
      openedBy: prismaDispute.openedBy,
      reason: prismaDispute.reason,
      status: DisputeStatus.fromPersistence(prismaDispute.status),
      resolution: prismaDispute.resolution,
      resolutionType: prismaDispute.resolutionType
        ? ResolutionType.fromPersistence(prismaDispute.resolutionType)
        : null,
      createdAt: prismaDispute.createdAt,
      assignedAt: prismaDispute.assignedAt,
      resolvedAt: prismaDispute.resolvedAt,
    });
  }
}
