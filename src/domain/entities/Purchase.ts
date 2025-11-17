import { Money } from '../value-objects/Money';

export interface PurchaseProps {
  id: string;
  sellerId: string;
  productId: string;
  providerId: string; // Denormalizado para queries y disputas
  amount: Money; // Precio del producto en el momento de compra
  adminCommission: Money; // Comisión calculada
  commissionRate: number; // Snapshot de la tasa en el momento de compra (ej: 0.05 = 5%)
  createdAt: Date;
}

/**
 * Purchase Entity (Aggregate Root)
 *
 * Representa una compra de producto digital en el marketplace.
 *
 * Reglas de negocio críticas:
 * 1. Un producto solo puede ser vendido UNA VEZ (productId unique)
 * 2. commissionRate es un SNAPSHOT del momento de compra (no cambia con el tiempo)
 * 3. adminCommission se calcula al momento de la compra
 * 4. Seller debe tener saldo suficiente en su wallet
 * 5. Purchase es INMUTABLE (no se puede modificar después de creada)
 * 6. El flow de dinero es: Seller Wallet -> Provider Wallet + Admin Wallet
 *
 * Flow de compra:
 * 1. Seller paga amount desde su wallet (debit)
 * 2. Admin recibe adminCommission (credit)
 * 3. Provider recibe (amount - adminCommission) (credit)
 * 4. Product cambia status a SOLD
 * 5. Purchase se registra (audit trail)
 *
 * @example
 * const purchase = Purchase.create({
 *   sellerId: 'user123',
 *   productId: 'prod456',
 *   amount: Money.create(15.99),
 *   commissionRate: 0.05 // 5%
 * });
 * console.log(purchase.adminCommission.toString()); // "$0.80"
 * console.log(purchase.providerEarnings.toString()); // "$15.19"
 */
export class Purchase {
  private constructor(private props: PurchaseProps) {
    Object.freeze(this);
  }

  /**
   * Crea una nueva Purchase
   *
   * @param sellerId - ID del usuario que compra
   * @param productId - ID del producto comprado
   * @param amount - Precio del producto
   * @param commissionRate - Tasa de comisión (ej: 0.05 para 5%)
   */
  static create(data: {
    sellerId: string;
    productId: string;
    amount: Money;
    commissionRate: number;
  }): Purchase {
    // Validaciones
    if (!data.sellerId || data.sellerId.trim().length === 0) {
      throw new Error('Seller ID is required');
    }

    if (!data.productId || data.productId.trim().length === 0) {
      throw new Error('Product ID is required');
    }

    if (!data.amount.isPositive()) {
      throw new Error('Purchase amount must be positive');
    }

    if (data.commissionRate < 0 || data.commissionRate > 1) {
      throw new Error('Commission rate must be between 0 and 1');
    }

    // Calcular comisión del admin
    const adminCommission = data.amount.multiply(data.commissionRate);

    return new Purchase({
      id: crypto.randomUUID(),
      sellerId: data.sellerId,
      productId: data.productId,
      amount: data.amount,
      adminCommission,
      commissionRate: data.commissionRate,
      createdAt: new Date(),
    });
  }

  /**
   * Reconstruye Purchase desde persistencia
   */
  static fromPersistence(props: PurchaseProps): Purchase {
    return new Purchase(props);
  }

  // ============================================
  // GETTERS
  // ============================================

  get id(): string {
    return this.props.id;
  }

  get sellerId(): string {
    return this.props.sellerId;
  }

  get productId(): string {
    return this.props.productId;
  }

  get providerId(): string {
    return this.props.providerId;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get adminCommission(): Money {
    return this.props.adminCommission;
  }

  get commissionRate(): number {
    return this.props.commissionRate;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  // ============================================
  // CALCULATED PROPERTIES
  // ============================================

  /**
   * Calcula las ganancias del provider (amount - adminCommission)
   */
  get providerEarnings(): Money {
    return this.props.amount.subtract(this.props.adminCommission);
  }

  /**
   * Obtiene el porcentaje de comisión como string (ej: "5%")
   */
  get commissionPercentage(): string {
    return `${(this.props.commissionRate * 100).toFixed(2)}%`;
  }

  // ============================================
  // BUSINESS LOGIC
  // ============================================

  /**
   * Verifica si la compra fue realizada por un usuario específico
   */
  isPurchasedBy(userId: string): boolean {
    return this.props.sellerId === userId;
  }

  /**
   * Verifica si la compra es de un producto específico
   */
  isForProduct(productId: string): boolean {
    return this.props.productId === productId;
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  /**
   * Serializa para respuestas de API
   */
  toJSON() {
    return {
      id: this.props.id,
      sellerId: this.props.sellerId,
      productId: this.props.productId,
      amount: this.props.amount.toPlainString(),
      currency: this.props.amount.currency,
      adminCommission: this.props.adminCommission.toPlainString(),
      providerEarnings: this.providerEarnings.toPlainString(),
      commissionRate: this.props.commissionRate,
      commissionPercentage: this.commissionPercentage,
      createdAt: this.props.createdAt,
    };
  }

  /**
   * Serializa para respuesta detallada (incluye breakdown de dinero)
   */
  toDetailedJSON() {
    return {
      ...this.toJSON(),
      breakdown: {
        totalPaid: this.props.amount.toPlainString(),
        adminCommission: this.props.adminCommission.toPlainString(),
        providerReceived: this.providerEarnings.toPlainString(),
        commissionRate: this.props.commissionRate,
      },
    };
  }

  /**
   * Serializa para persistencia en Prisma
   */
  toPersistence() {
    return {
      id: this.props.id,
      sellerId: this.props.sellerId,
      productId: this.props.productId,
      amount: this.props.amount.amount, // Decimal para Prisma
      currency: this.props.amount.currency,
      adminCommission: this.props.adminCommission.amount, // Decimal para Prisma
      commissionRate: this.props.commissionRate,
      createdAt: this.props.createdAt,
    };
  }
}
