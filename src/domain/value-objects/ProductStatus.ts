/**
 * ProductStatus Value Object
 *
 * Representa el estado de un producto en el marketplace.
 *
 * Estados posibles:
 * - AVAILABLE: Producto disponible para compra
 * - SOLD: Producto ya vendido (no disponible)
 * - RESERVED: Producto reservado temporalmente durante proceso de compra
 * - SUSPENDED: Producto suspendido por admin (ej: reporte de fraude)
 *
 * Transiciones válidas:
 * - AVAILABLE -> RESERVED (inicio de compra)
 * - RESERVED -> SOLD (compra completada)
 * - RESERVED -> AVAILABLE (compra cancelada/timeout)
 * - AVAILABLE -> SUSPENDED (acción admin)
 * - SUSPENDED -> AVAILABLE (reactivación admin)
 * - SOLD -> No tiene transiciones (estado final)
 *
 * @example
 * const status = ProductStatus.create('available');
 * if (status.isAvailable()) {
 *   // Permitir compra
 * }
 */
export enum ProductStatusEnum {
  AVAILABLE = 'available',
  SOLD = 'sold',
  RESERVED = 'reserved',
  SUSPENDED = 'suspended',
}

export class ProductStatus {
  private constructor(private readonly status: ProductStatusEnum) {
    Object.freeze(this);
  }

  /**
   * Crea un ProductStatus desde string
   * @throws Error si el status no es válido
   */
  static create(status: string): ProductStatus {
    const normalizedStatus = status.toLowerCase();

    const validStatuses = Object.values(ProductStatusEnum);
    if (!validStatuses.includes(normalizedStatus as ProductStatusEnum)) {
      throw new Error(
        `Invalid product status: ${status}. Valid values: ${validStatuses.join(', ')}`
      );
    }

    return new ProductStatus(normalizedStatus as ProductStatusEnum);
  }

  /**
   * Crea ProductStatus desde persistencia
   */
  static fromPersistence(status: string): ProductStatus {
    return new ProductStatus(status as ProductStatusEnum);
  }

  /**
   * Factory methods para cada estado
   */
  static available(): ProductStatus {
    return new ProductStatus(ProductStatusEnum.AVAILABLE);
  }

  static sold(): ProductStatus {
    return new ProductStatus(ProductStatusEnum.SOLD);
  }

  static reserved(): ProductStatus {
    return new ProductStatus(ProductStatusEnum.RESERVED);
  }

  static suspended(): ProductStatus {
    return new ProductStatus(ProductStatusEnum.SUSPENDED);
  }

  // ============================================
  // GETTERS
  // ============================================

  get value(): string {
    return this.status;
  }

  // ============================================
  // STATUS CHECKS
  // ============================================

  isAvailable(): boolean {
    return this.status === ProductStatusEnum.AVAILABLE;
  }

  isSold(): boolean {
    return this.status === ProductStatusEnum.SOLD;
  }

  isReserved(): boolean {
    return this.status === ProductStatusEnum.RESERVED;
  }

  isSuspended(): boolean {
    return this.status === ProductStatusEnum.SUSPENDED;
  }

  /**
   * Verifica si el producto puede ser comprado
   */
  canBePurchased(): boolean {
    return this.status === ProductStatusEnum.AVAILABLE;
  }

  /**
   * Verifica si el producto puede ser editado por el provider
   */
  canBeEdited(): boolean {
    return (
      this.status === ProductStatusEnum.AVAILABLE ||
      this.status === ProductStatusEnum.SUSPENDED
    );
  }

  /**
   * Verifica si el producto puede ser eliminado
   */
  canBeDeleted(): boolean {
    return this.status !== ProductStatusEnum.SOLD; // Solo productos vendidos no se pueden eliminar
  }

  // ============================================
  // TRANSITIONS
  // ============================================

  /**
   * Valida si una transición de estado es válida
   */
  canTransitionTo(newStatus: ProductStatus): boolean {
    const validTransitions: Record<ProductStatusEnum, ProductStatusEnum[]> = {
      [ProductStatusEnum.AVAILABLE]: [
        ProductStatusEnum.RESERVED,
        ProductStatusEnum.SUSPENDED,
      ],
      [ProductStatusEnum.RESERVED]: [
        ProductStatusEnum.SOLD,
        ProductStatusEnum.AVAILABLE,
      ],
      [ProductStatusEnum.SUSPENDED]: [ProductStatusEnum.AVAILABLE],
      [ProductStatusEnum.SOLD]: [], // Estado final
    };

    return validTransitions[this.status].includes(newStatus.status);
  }

  /**
   * Valida y retorna error si transición no es válida
   */
  validateTransition(newStatus: ProductStatus): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid status transition from ${this.status} to ${newStatus.status}`
      );
    }
  }

  // ============================================
  // COMPARISON
  // ============================================

  equals(other: ProductStatus): boolean {
    return this.status === other.status;
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  toString(): string {
    return this.status;
  }

  toJSON(): string {
    return this.status;
  }
}
