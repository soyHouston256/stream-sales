/**
 * DisputeStatus Value Object
 *
 * Representa los posibles estados de una disputa en el sistema.
 *
 * Estados válidos:
 * - open: Disputa creada, esperando asignación a conciliator
 * - under_review: Asignada a conciliator, en proceso de investigación
 * - resolved: Conciliator tomó decisión, esperando ejecución
 * - closed: Disputa completamente cerrada (después de ejecutar resolución)
 *
 * Transiciones válidas:
 * - open → under_review (cuando conciliator se auto-asigna)
 * - under_review → resolved (cuando conciliator resuelve)
 * - resolved → closed (después de ejecutar transacciones financieras)
 *
 * Transiciones inválidas (lanzan error):
 * - closed → cualquier estado (disputa cerrada es final)
 * - open → resolved (debe pasar por under_review)
 */
export class DisputeStatus {
  private static readonly VALID_STATUSES = [
    'open',
    'under_review',
    'resolved',
    'closed',
  ] as const;

  public readonly value: (typeof DisputeStatus.VALID_STATUSES)[number];

  private constructor(
    status: (typeof DisputeStatus.VALID_STATUSES)[number]
  ) {
    this.value = status;
    Object.freeze(this);
  }

  /**
   * Crea DisputeStatus desde valor primitivo
   */
  static create(
    status: string
  ): DisputeStatus {
    if (!this.isValid(status)) {
      throw new Error(
        `Invalid dispute status: "${status}". Must be one of: ${this.VALID_STATUSES.join(', ')}`
      );
    }

    return new DisputeStatus(
      status as (typeof DisputeStatus.VALID_STATUSES)[number]
    );
  }

  /**
   * Reconstruye desde persistencia (sin validación de transiciones)
   */
  static fromPersistence(status: string): DisputeStatus {
    return this.create(status);
  }

  /**
   * Estados pre-construidos (factory methods)
   */
  static open(): DisputeStatus {
    return new DisputeStatus('open');
  }

  static underReview(): DisputeStatus {
    return new DisputeStatus('under_review');
  }

  static resolved(): DisputeStatus {
    return new DisputeStatus('resolved');
  }

  static closed(): DisputeStatus {
    return new DisputeStatus('closed');
  }

  // ============================================
  // VALIDACIONES
  // ============================================

  private static isValid(status: string): boolean {
    return this.VALID_STATUSES.includes(
      status as (typeof DisputeStatus.VALID_STATUSES)[number]
    );
  }

  /**
   * Verifica si puede transicionar a un nuevo estado
   */
  canTransitionTo(newStatus: DisputeStatus): boolean {
    // Closed es estado final, no puede cambiar
    if (this.value === 'closed') {
      return false;
    }

    // Open puede ir a under_review
    if (this.value === 'open') {
      return newStatus.value === 'under_review';
    }

    // Under review puede ir a resolved
    if (this.value === 'under_review') {
      return newStatus.value === 'resolved';
    }

    // Resolved puede ir a closed
    if (this.value === 'resolved') {
      return newStatus.value === 'closed';
    }

    return false;
  }

  /**
   * Valida y retorna error si transición es inválida
   */
  validateTransition(newStatus: DisputeStatus): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid status transition: ${this.value} → ${newStatus.value}. ` +
          `Valid transitions from ${this.value}: ${this.getValidNextStatuses().join(', ')}`
      );
    }
  }

  /**
   * Obtiene los siguientes estados válidos desde el estado actual
   */
  private getValidNextStatuses(): string[] {
    switch (this.value) {
      case 'open':
        return ['under_review'];
      case 'under_review':
        return ['resolved'];
      case 'resolved':
        return ['closed'];
      case 'closed':
        return [];
      default:
        return [];
    }
  }

  // ============================================
  // QUERIES
  // ============================================

  isOpen(): boolean {
    return this.value === 'open';
  }

  isUnderReview(): boolean {
    return this.value === 'under_review';
  }

  isResolved(): boolean {
    return this.value === 'resolved';
  }

  isClosed(): boolean {
    return this.value === 'closed';
  }

  /**
   * Verifica si la disputa aún está activa (no cerrada)
   */
  isActive(): boolean {
    return !this.isClosed();
  }

  /**
   * Verifica si la disputa puede ser asignada a un conciliator
   */
  canBeAssigned(): boolean {
    return this.isOpen();
  }

  /**
   * Verifica si la disputa puede ser resuelta
   */
  canBeResolved(): boolean {
    return this.isUnderReview();
  }

  // ============================================
  // COMPARACIÓN E IGUALDAD
  // ============================================

  equals(other: DisputeStatus): boolean {
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
      open: 'Open',
      under_review: 'Under Review',
      resolved: 'Resolved',
      closed: 'Closed',
    };

    return displayMap[this.value] || this.value;
  }

  /**
   * Serializa para persistencia
   */
  toPersistence(): string {
    return this.value;
  }
}
