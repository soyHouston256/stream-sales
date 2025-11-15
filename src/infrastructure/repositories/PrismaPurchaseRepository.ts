import { PrismaClient } from '@prisma/client';
import { Purchase } from '../../domain/entities/Purchase';
import { IPurchaseRepository } from '../../domain/repositories/IPurchaseRepository';
import { Money } from '../../domain/value-objects/Money';
import { Decimal } from 'decimal.js';

type PrismaPurchase = {
  id: string;
  userId: string;
  productId: string;
  amount: any;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
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
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Guarda una nueva compra en la base de datos
   *
   * IMPORTANTE: Debe incluir providerId obtenido del Product
   *
   * @param purchase - Purchase entity
   * @returns Purchase guardado
   * @throws Error si productId ya existe (constraint violation)
   */
  async save(purchase: Purchase): Promise<Purchase> {
    // Necesitamos obtener el providerId del producto
    const product = await this.prisma.product.findUnique({
      where: { id: purchase.productId },
      select: { providerId: true },
    });

    if (!product) {
      throw new Error(`Product with ID ${purchase.productId} not found`);
    }

    const data = {
      id: purchase.id,
      sellerId: purchase.sellerId,
      productId: purchase.productId,
      providerId: product.providerId,
      amount: purchase.amount.amount, // Decimal
      providerEarnings: purchase.providerEarnings.amount, // Decimal
      adminCommission: purchase.adminCommission.amount, // Decimal
      commissionRate: new Decimal(purchase.commissionRate * 100), // 0.05 -> 5.00
      status: 'pending', // Inicial siempre pending
      createdAt: purchase.createdAt,
    };

    const savedPurchase = await this.prisma.purchase.create({
      data,
    });

    return this.toDomain(savedPurchase);
  }

  /**
   * Buscar compra por ID
   */
  async findById(id: string): Promise<Purchase | null> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
    });

    return purchase ? this.toDomain(purchase) : null;
  }

  /**
   * Buscar compra por productId
   *
   * Business Rule: Un producto solo puede ser vendido una vez
   */
  async findByProductId(productId: string): Promise<Purchase | null> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { productId },
    });

    return purchase ? this.toDomain(purchase) : null;
  }

  /**
   * Buscar todas las compras de un seller
   *
   * @param sellerId - ID del comprador
   * @param filters - Filtros opcionales
   * @returns Array de compras ordenadas por fecha descendente
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
    const where: any = { sellerId };

    // Filtro por rango de fechas
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const purchases = await this.prisma.purchase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters?.offset || 0,
      take: filters?.limit || 20, // Default 20
    });

    return purchases.map((p: PrismaPurchase) => this.toDomain(p));
  }

  /**
   * Contar total de compras de un seller
   */
  async countBySellerId(sellerId: string): Promise<number> {
    return this.prisma.purchase.count({
      where: { sellerId },
    });
  }

  /**
   * Buscar todas las compras de un producto
   *
   * Nota: Por business rule, debería ser máximo 1
   */
  async findByProductId_All(productId: string): Promise<Purchase[]> {
    const purchases = await this.prisma.purchase.findMany({
      where: { productId },
    });

    return purchases.map((p: PrismaPurchase) => this.toDomain(p));
  }

  /**
   * Calcular total gastado por un seller
   *
   * @param sellerId - ID del usuario
   * @returns Total amount gastado como número
   */
  async getTotalSpentBySeller(sellerId: string): Promise<number> {
    const result = await this.prisma.purchase.aggregate({
      where: { sellerId },
      _sum: { amount: true },
    });

    return result._sum.amount?.toNumber() || 0;
  }

  /**
   * Calcular total de comisiones generadas
   *
   * @returns Total de comisiones como número
   */
  async getTotalAdminCommissions(): Promise<number> {
    const result = await this.prisma.purchase.aggregate({
      _sum: { adminCommission: true },
    });

    return result._sum.adminCommission?.toNumber() || 0;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Convierte de Prisma model a Domain entity
   */
  private toDomain(prismaPurchase: any): Purchase {
    return Purchase.fromPersistence({
      id: prismaPurchase.id,
      sellerId: prismaPurchase.sellerId,
      productId: prismaPurchase.productId,
      amount: Money.fromPersistence(
        prismaPurchase.amount,
        'USD' // TODO: Obtener currency de la compra
      ),
      adminCommission: Money.fromPersistence(
        prismaPurchase.adminCommission,
        'USD'
      ),
      commissionRate: prismaPurchase.commissionRate.toNumber() / 100, // 5.00 -> 0.05
      createdAt: prismaPurchase.createdAt,
    });
  }
}
