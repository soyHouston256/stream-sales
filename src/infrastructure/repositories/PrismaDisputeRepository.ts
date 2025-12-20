import { PrismaClient, Prisma } from '@prisma/client';
import { Dispute } from '../../domain/entities/Dispute';
import {
  IDisputeRepository,
  DisputeFilters,
} from '../../domain/repositories/IDisputeRepository';
import { DisputeStatus } from '../../domain/value-objects/DisputeStatus';
import { ResolutionType } from '../../domain/value-objects/ResolutionType';
/**
 * Base type for Dispute from Prisma (without relations)
 * Used as minimum type for toDomain conversion
 */
type DisputeBase = Prisma.DisputeGetPayload<{
  select: {
    id: true;
    orderId: true;
    sellerId: true;
    providerId: true;
    conciliatorId: true;
    openedBy: true;
    reason: true;
    status: true;
    resolution: true;
    resolutionType: true;
    createdAt: true;
    assignedAt: true;
    resolvedAt: true;
  };
}>;

/**
 * Type for Dispute with all common relations from Prisma queries
 */
type DisputeWithRelations = DisputeBase & {
  order?: {
    id: string;
    totalAmount: Prisma.Decimal;
    status: string;
    createdAt: Date;
    items?: Array<{
      variant: {
        price: Prisma.Decimal;
        product: {
          id: string;
          name: string;
          category: string;
        };
      };
    }>;
  };
  seller?: { id: string; name: string | null; email: string };
  provider?: { id: string; name: string | null; email: string };
  conciliator?: { id: string; name: string | null; email: string } | null;
};

/**
 * Type for Dispute stats queries
 */
type DisputeForStats = Prisma.DisputeGetPayload<{
  select: { assignedAt: true; resolvedAt: true };
}>;

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
  constructor(private readonly prisma: PrismaClient) { }

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
        order: true,
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
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
      where: { orderId: purchaseId },
      include: {
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        seller: { select: { id: true, name: true, email: true } },
        provider: { select: { id: true, name: true, email: true } },
        conciliator: { select: { id: true, name: true, email: true } },
      },
    });

    return disputes.map((d) => this.toDomain(d));
  }

  /**
   * Busca disputas asignadas a un conciliator
   */
  async findByConciliator(
    conciliatorId: string,
    status?: string
  ): Promise<Dispute[]> {
    const where: Prisma.DisputeWhereInput = { conciliatorId };

    if (status) {
      where.status = status;
    }

    const disputes = await this.prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
    const where: Prisma.DisputeWhereInput = conciliatorId ? { conciliatorId } : {};

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
      const totalHours = resolvedDisputes.reduce((sum: number, d: DisputeForStats) => {
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
  private buildWhereClause(filters?: DisputeFilters): Prisma.DisputeWhereInput {
    if (!filters) return {};

    const where: Prisma.DisputeWhereInput = {};

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
  private toDomain(prismaDispute: DisputeWithRelations): Dispute {
    return Dispute.fromPersistence({
      id: prismaDispute.id,
      purchaseId: prismaDispute.orderId,
      sellerId: prismaDispute.sellerId,
      providerId: prismaDispute.providerId,
      conciliatorId: prismaDispute.conciliatorId,
      openedBy: prismaDispute.openedBy as 'seller' | 'provider',
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

  /**
   * Convierte a formato JSON con relaciones incluidas
   */
  private toJSONWithRelations(prismaDispute: DisputeWithRelations): Record<string, unknown> {
    const dispute = this.toDomain(prismaDispute);
    const json = dispute.toJSON();

    // Agregar relaciones si existen
    // Note: Order structure is different from Purchase. 
    // We need to extract product info from OrderItems.
    // Assuming first item for now or adapting structure.

    let productInfo = undefined;
    if (prismaDispute.order?.items?.[0]?.variant?.product) {
      productInfo = {
        id: prismaDispute.order.items[0].variant.product.id,
        name: prismaDispute.order.items[0].variant.product.name,
        category: prismaDispute.order.items[0].variant.product.category,
      };
    }

    return {
      ...json,
      purchase: prismaDispute.order ? {
        id: prismaDispute.order.id,
        amount: prismaDispute.order.totalAmount,
        product: productInfo,
      } : undefined,
      seller: prismaDispute.seller || undefined,
      provider: prismaDispute.provider || undefined,
      conciliator: prismaDispute.conciliator || undefined,
    };
  }
}
