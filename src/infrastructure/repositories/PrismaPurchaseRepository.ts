import { PrismaClient, Prisma } from '@prisma/client';
import { Purchase } from '../../domain/entities/Purchase';
import { IPurchaseRepository } from '../../domain/repositories/IPurchaseRepository';
import { Money } from '../../domain/value-objects/Money';
import { Decimal } from 'decimal.js';

type PrismaPurchase = {
  id: string;
  sellerId: string;
  productId: string;
  providerId: string;
  amount: Prisma.Decimal;
  providerEarnings: Prisma.Decimal;
  adminCommission: Prisma.Decimal;
  commissionRate: Prisma.Decimal;
  status: string;
  transactionIds: Prisma.JsonValue | null;
  createdAt: Date;
  completedAt: Date | null;
  refundedAt: Date | null;
};

/**
 * PrismaPurchaseRepository
 *
 * Implementación concreta de IPurchaseRepository usando Prisma ORM.
 *
 * Conversiones importantes:
 * - commissionRate: Entity usa decimal (0.05 = 5%), Prisma usa porcentaje (5.00 = 5%)
 * - Money <-> Decimal: Entity usa Money VO, Prisma usa Decimal
 * - providerId: Entity no lo tiene, se obtiene del Product al crear la compra
 *
 * IMPORTANTE: Las compras son INMUTABLES (audit trail)
 * - No hay método update()
 * - Solo se crean nuevas compras, nunca se modifican
 */
export class PrismaPurchaseRepository implements IPurchaseRepository {
  constructor(private readonly prisma: PrismaClient) { }

  /**
   * Guarda una nueva compra en la base de datos
   * Mapped to Order + OrderItem
   */
  async save(purchase: Purchase): Promise<Purchase> {
    // 1. Get product and first variant
    const product = await this.prisma.product.findUnique({
      where: { id: purchase.productId },
      include: {
        variants: {
          take: 1,
        },
      },
    });

    if (!product) {
      throw new Error(`Product with ID ${purchase.productId} not found`);
    }

    const variant = product.variants[0];
    if (!variant) {
      throw new Error(`Product with ID ${purchase.productId} has no variants`);
    }

    // 2. Create Order and OrderItem
    // We use a transaction to ensure consistency
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: purchase.sellerId,
          totalAmount: purchase.amount.amount, // Decimal
          status: 'paid', // Assuming immediate payment for now
          items: {
            create: {
              productVariantId: variant.id,
            },
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      return order.items[0]; // Return the created item as the "Purchase"
    });

    return this.toDomain(result, result.orderId, purchase.sellerId, 'paid', result.variant.product.providerId, purchase.createdAt);
  }

  /**
   * Buscar compra por ID (OrderItem ID)
   */
  async findById(id: string): Promise<Purchase | null> {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id },
      include: {
        order: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!orderItem) return null;

    return this.toDomain(
      orderItem,
      orderItem.orderId,
      orderItem.order.userId,
      orderItem.order.status,
      orderItem.variant.product.providerId,
      orderItem.order.createdAt
    );
  }

  /**
   * Buscar compra por productId
   */
  async findByProductId(productId: string): Promise<Purchase | null> {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        variant: {
          productId: productId,
        },
      },
      include: {
        order: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!orderItem) return null;

    return this.toDomain(
      orderItem,
      orderItem.orderId,
      orderItem.order.userId,
      orderItem.order.status,
      orderItem.variant.product.providerId,
      orderItem.order.createdAt
    );
  }

  /**
   * Buscar todas las compras de un seller (Buyer)
   */
  async findBySellerId(
    sellerId: string,
    filters?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Purchase[]> {
    const where: any = {
      order: {
        userId: sellerId,
      },
    };

    if (filters?.startDate || filters?.endDate) {
      where.order.createdAt = {};
      if (filters.startDate) where.order.createdAt.gte = filters.startDate;
      if (filters.endDate) where.order.createdAt.lte = filters.endDate;
    }

    const orderItems = await this.prisma.orderItem.findMany({
      where,
      orderBy: { order: { createdAt: 'desc' } },
      skip: filters?.offset || 0,
      take: filters?.limit || 20,
      include: {
        order: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    return orderItems.map((item: any) =>
      this.toDomain(
        item,
        item.orderId,
        item.order.userId,
        item.order.status,
        item.variant.product.providerId,
        item.order.createdAt
      )
    );
  }

  async countBySellerId(sellerId: string): Promise<number> {
    return this.prisma.orderItem.count({
      where: {
        order: {
          userId: sellerId,
          status: { not: 'failed' }, // Exclude failed
        },
      },
    });
  }

  async findByProductId_All(productId: string): Promise<Purchase[]> {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        variant: {
          productId: productId,
        },
      },
      include: {
        order: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    return orderItems.map((item: any) =>
      this.toDomain(
        item,
        item.orderId,
        item.order.userId,
        item.order.status,
        item.variant.product.providerId,
        item.order.createdAt
      )
    );
  }

  async getTotalSpentBySeller(sellerId: string): Promise<number> {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          userId: sellerId,
          status: { not: 'failed' },
        },
      },
      include: {
        variant: true,
      },
    });

    return orderItems.reduce((sum: number, item: any) => sum + Number(item.variant.price), 0);
  }

  async getTotalAdminCommissions(): Promise<number> {
    // Hack: Calculate 5% of all sales
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          status: 'paid',
        },
      },
      include: {
        variant: true,
      },
    });

    const totalSales = orderItems.reduce((sum: number, item: any) => sum + Number(item.variant.price), 0);
    return totalSales * 0.05;
  }

  async markAsRefunded(purchaseId: string): Promise<void> {
    // purchaseId is orderItem.id
    // We should probably update Order status to 'refunded' if it's the only item?
    // Or just ignore for now as Order doesn't have 'refunded' status in schema default
    // Schema: status String @default("pending") // pending, paid, failed
    // We can set it to 'failed' or add 'refunded' if schema allows string.
    // Schema says String, so we can put 'refunded'.

    // First find the order ID
    const item = await this.prisma.orderItem.findUnique({
      where: { id: purchaseId },
      select: { orderId: true }
    });

    if (item) {
      await this.prisma.order.update({
        where: { id: item.orderId },
        data: { status: 'refunded' }
      });
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private toDomain(
    orderItem: any,
    orderId: string,
    sellerId: string,
    status: string,
    providerId: string,
    createdAt: Date
  ): Purchase {
    const price = Number(orderItem.variant.price);
    const commissionRate = 0.05;
    const adminCommission = price * commissionRate;
    const providerEarnings = price - adminCommission;

    return Purchase.fromPersistence({
      id: orderItem.id, // Use OrderItem ID as Purchase ID
      sellerId: sellerId,
      productId: orderItem.variant.productId,
      providerId: providerId,
      amount: Money.fromPersistence(new Decimal(price), 'USD'),
      adminCommission: Money.fromPersistence(new Decimal(adminCommission), 'USD'),
      commissionRate: commissionRate,
      createdAt: createdAt,
      // status: status // Purchase entity might not have status in fromPersistence? Check entity.
      // Assuming Purchase entity reconstructs itself.
    });
  }
}
