/**
 * ResolutionType Value Object
 *
 * Representa el tipo de resolución aplicada a una disputa por el conciliator.
 *
 * Tipos de resolución:
 *
 * 1. refund_seller: Reembolso completo al seller
 *    - Se debita del provider
 *    - Se acredita al seller
 *    - Producto permanece con seller
 *    - Usado cuando: Producto no funciona, credenciales incorrectas, fraude del provider
 *
 * 2. favor_provider: A favor del provider (no hay reembolso)
 *    - No hay transacciones financieras
 *    - Producto permanece con seller
 *    - Usado cuando: Reclamo del seller es infundado, producto funciona correctamente
 *
 * 3. partial_refund: Reembolso parcial (50%)
 *    - Se debita 50% del provider
 *    - Se acredita 50% al seller
 *    - Producto permanece con seller
 *    - Usado cuando: Problemas menores, producto parcialmente funcional
 *
 * 4. no_action: Sin acción
 *    - No hay transacciones financieras
 *    - Se cierra la disputa sin cambios
 *    - Usado cuando: Las partes llegaron a acuerdo externo, disputa retirada
 */
export class ResolutionType {
  private static readonly VALID_TYPES = [
    'refund_seller',
    'favor_provider',
    'partial_refund',
    'no_action',
  ] as const;

  public readonly value: (typeof ResolutionType.VALID_TYPES)[number];

  private constructor(type: (typeof ResolutionType.VALID_TYPES)[number]) {
    this.value = type;
    Object.freeze(this);
  }

  /**
   * Crea ResolutionType desde valor primitivo
   */
  static create(type: string): ResolutionType {
    if (!this.isValid(type)) {
      throw new Error(
        `Invalid resolution type: "${type}". Must be one of: ${this.VALID_TYPES.join(', ')}`
      );
    }

    return new ResolutionType(
      type as (typeof ResolutionType.VALID_TYPES)[number]
    );
  }

  /**
   * Reconstruye desde persistencia
   */
  static fromPersistence(type: string): ResolutionType {
    return this.create(type);
  }

  /**
   * Factory methods para cada tipo
   */
  static refundSeller(): ResolutionType {
    return new ResolutionType('refund_seller');
  }

  static favorProvider(): ResolutionType {
    return new ResolutionType('favor_provider');
  }

  static partialRefund(): ResolutionType {
    return new ResolutionType('partial_refund');
  }

  static noAction(): ResolutionType {
    return new ResolutionType('no_action');
  }

  // ============================================
  // VALIDACIONES
  // ============================================

  private static isValid(type: string): boolean {
    return this.VALID_TYPES.includes(
      type as (typeof ResolutionType.VALID_TYPES)[number]
    );
  }

  // ============================================
  // BUSINESS LOGIC
  // ============================================

  /**
   * Verifica si este tipo de resolución requiere transacciones financieras
   */
  requiresFinancialTransactions(): boolean {
    return (
      this.value === 'refund_seller' || this.value === 'partial_refund'
    );
  }

  /**
   * Obtiene el porcentaje de reembolso (0-100)
   */
  getRefundPercentage(): number {
    switch (this.value) {
      case 'refund_seller':
        return 100; // Reembolso completo
      case 'partial_refund':
        return 50; // Reembolso parcial (50%)
      case 'favor_provider':
      case 'no_action':
        return 0; // Sin reembolso
      default:
        return 0;
    }
  }

  /**
   * Verifica si el seller recibe dinero de vuelta
   */
  sellerReceivesRefund(): boolean {
    return this.getRefundPercentage() > 0;
  }

  /**
   * Verifica si el provider debe pagar
   */
  providerMustPay(): boolean {
    return this.requiresFinancialTransactions();
  }

  // ============================================
  // QUERIES
  // ============================================

  isRefundSeller(): boolean {
    return this.value === 'refund_seller';
  }

  isFavorProvider(): boolean {
    return this.value === 'favor_provider';
  }

  isPartialRefund(): boolean {
    return this.value === 'partial_refund';
  }

  isNoAction(): boolean {
    return this.value === 'no_action';
  }

  // ============================================
  // COMPARACIÓN E IGUALDAD
  // ============================================

  equals(other: ResolutionType): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  /**
   * Serializa para UI (con formato amigable)
   */
  toDisplayString(): string {
    const displayMap: Record<string, string> = {
      refund_seller: 'Refund Seller (100%)',
      favor_provider: 'Favor Provider (No Refund)',
      partial_refund: 'Partial Refund (50%)',
      no_action: 'No Action',
    };

    return displayMap[this.value] || this.value;
  }

  /**
   * Obtiene descripción detallada para UI
   */
  getDescription(): string {
    const descriptions: Record<string, string> = {
      refund_seller:
        'Full refund to seller. Provider will be debited and seller credited.',
      favor_provider:
        'No refund. Dispute closed in favor of provider. No financial transactions.',
      partial_refund:
        'Partial refund (50%) to seller. Provider will be debited 50% and seller credited 50%.',
      no_action:
        'No action taken. Dispute closed without financial transactions.',
    };

    return descriptions[this.value] || '';
  }

  /**
   * Serializa para persistencia
   */
  toPersistence(): string {
    return this.value;
  }

  /**
   * Serializa para API con información adicional
   */
  toJSON() {
    return {
      type: this.value,
      displayName: this.toDisplayString(),
      description: this.getDescription(),
      refundPercentage: this.getRefundPercentage(),
      requiresFinancialTransactions: this.requiresFinancialTransactions(),
    };
  }
}
