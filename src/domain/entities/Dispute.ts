import { DisputeStatus } from '../value-objects/DisputeStatus';
import { ResolutionType } from '../value-objects/ResolutionType';

export interface DisputeProps {
  id: string;
  purchaseId: string;
  sellerId: string;
  providerId: string;
  conciliatorId: string | null;
  openedBy: 'seller' | 'provider';
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  resolutionType: ResolutionType | null;
  createdAt: Date;
  assignedAt: Date | null;
  resolvedAt: Date | null;
}

/**
 * Dispute Entity (Aggregate Root)
 *
 * Representa una disputa entre seller y provider sobre una compra.
 *
 * Reglas de negocio críticas:
 * 1. Solo puede haber UNA disputa por purchase (purchaseId unique)
 * 2. Solo seller o provider pueden abrir disputa
 * 3. Solo puede abrirse sobre purchases con status "completed"
 * 4. Status transitions deben seguir el flujo: open → under_review → resolved → closed
 * 5. Solo conciliator puede asignar y resolver disputas
 * 6. Resolución con refund requiere que provider tenga saldo suficiente
 * 7. Una vez cerrada, la disputa es INMUTABLE
 *
 * Ciclo de vida:
 * 1. Seller/Provider abre disputa (status: open)
 * 2. Conciliator se auto-asigna (status: under_review, assignedAt)
 * 3. Conciliator resuelve (status: resolved, resolution, resolutionType, resolvedAt)
 * 4. Sistema ejecuta transacciones financieras según resolutionType
 * 5. Disputa se cierra (status: closed)
 *
 * @example
 * const dispute = Dispute.create({
 *   purchaseId: 'purchase123',
 *   sellerId: 'seller456',
 *   providerId: 'provider789',
 *   openedBy: 'seller',
 *   reason: 'Product credentials do not work'
 * });
 *
 * dispute.assignToConciliator('conciliator001');
 * dispute.resolve('Verified credentials are invalid', ResolutionType.refundSeller());
 * dispute.close(); // After financial transactions executed
 */
export class Dispute {
  private props: DisputeProps;

  private constructor(props: DisputeProps) {
    this.props = props;
  }

  /**
   * Crea una nueva Dispute
   *
   * @param purchaseId - ID de la compra en disputa
   * @param sellerId - ID del seller (comprador)
   * @param providerId - ID del provider (vendedor)
   * @param openedBy - Quién abrió la disputa (seller o provider)
   * @param reason - Razón detallada de la disputa
   */
  static create(data: {
    purchaseId: string;
    sellerId: string;
    providerId: string;
    openedBy: 'seller' | 'provider';
    reason: string;
  }): Dispute {
    // Validaciones
    if (!data.purchaseId || data.purchaseId.trim().length === 0) {
      throw new Error('Purchase ID is required');
    }

    if (!data.sellerId || data.sellerId.trim().length === 0) {
      throw new Error('Seller ID is required');
    }

    if (!data.providerId || data.providerId.trim().length === 0) {
      throw new Error('Provider ID is required');
    }

    if (data.openedBy !== 'seller' && data.openedBy !== 'provider') {
      throw new Error('openedBy must be either "seller" or "provider"');
    }

    if (!data.reason || data.reason.trim().length < 10) {
      throw new Error('Reason must be at least 10 characters');
    }

    if (data.reason.length > 2000) {
      throw new Error('Reason must not exceed 2000 characters');
    }

    return new Dispute({
      id: crypto.randomUUID(),
      purchaseId: data.purchaseId,
      sellerId: data.sellerId,
      providerId: data.providerId,
      conciliatorId: null,
      openedBy: data.openedBy,
      reason: data.reason.trim(),
      status: DisputeStatus.open(),
      resolution: null,
      resolutionType: null,
      createdAt: new Date(),
      assignedAt: null,
      resolvedAt: null,
    });
  }

  /**
   * Reconstruye Dispute desde persistencia
   */
  static fromPersistence(props: DisputeProps): Dispute {
    return new Dispute(props);
  }

  // ============================================
  // GETTERS
  // ============================================

  get id(): string {
    return this.props.id;
  }

  get purchaseId(): string {
    return this.props.purchaseId;
  }

  get sellerId(): string {
    return this.props.sellerId;
  }

  get providerId(): string {
    return this.props.providerId;
  }

  get conciliatorId(): string | null {
    return this.props.conciliatorId;
  }

  get openedBy(): 'seller' | 'provider' {
    return this.props.openedBy;
  }

  get reason(): string {
    return this.props.reason;
  }

  get status(): DisputeStatus {
    return this.props.status;
  }

  get resolution(): string | null {
    return this.props.resolution;
  }

  get resolutionType(): ResolutionType | null {
    return this.props.resolutionType;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get assignedAt(): Date | null {
    return this.props.assignedAt;
  }

  get resolvedAt(): Date | null {
    return this.props.resolvedAt;
  }

  // ============================================
  // BUSINESS LOGIC - STATE TRANSITIONS
  // ============================================

  /**
   * Asigna la disputa a un conciliator
   *
   * Business Rules:
   * - Solo puede asignarse si status = open
   * - conciliatorId no puede estar vacío
   * - Cambia status a under_review
   * - Establece assignedAt timestamp
   *
   * @param conciliatorId - ID del conciliator que se auto-asigna
   * @throws Error si la disputa ya está asignada o no está en estado open
   */
  assignToConciliator(conciliatorId: string): void {
    if (!conciliatorId || conciliatorId.trim().length === 0) {
      throw new Error('Conciliator ID is required');
    }

    if (!this.props.status.isOpen()) {
      throw new Error(
        `Cannot assign dispute. Current status: ${this.props.status.value}. Must be "open".`
      );
    }

    if (this.props.conciliatorId) {
      throw new Error(
        `Dispute is already assigned to conciliator: ${this.props.conciliatorId}`
      );
    }

    // Validar transición de estado
    const newStatus = DisputeStatus.underReview();
    this.props.status.validateTransition(newStatus);

    // Aplicar cambios
    this.props.conciliatorId = conciliatorId;
    this.props.status = newStatus;
    this.props.assignedAt = new Date();
  }

  /**
   * Reasigna la disputa a otro conciliator (solo admin)
   *
   * @param newConciliatorId - ID del nuevo conciliator
   * @throws Error si la disputa no está en under_review
   */
  reassignToConciliator(newConciliatorId: string): void {
    if (!newConciliatorId || newConciliatorId.trim().length === 0) {
      throw new Error('New conciliator ID is required');
    }

    if (!this.props.status.isUnderReview()) {
      throw new Error(
        'Can only reassign disputes that are under review'
      );
    }

    if (!this.props.conciliatorId) {
      throw new Error('Dispute is not assigned to any conciliator');
    }

    this.props.conciliatorId = newConciliatorId;
    this.props.assignedAt = new Date(); // Update timestamp
  }

  /**
   * Resuelve la disputa con una decisión del conciliator
   *
   * Business Rules:
   * - Solo puede resolverse si status = under_review
   * - Debe tener conciliator asignado
   * - Cambia status a resolved
   * - Establece resolution, resolutionType y resolvedAt
   *
   * @param resolution - Explicación detallada de la resolución
   * @param resolutionType - Tipo de resolución aplicada
   * @throws Error si la disputa no puede ser resuelta
   */
  resolve(resolution: string, resolutionType: ResolutionType): void {
    if (!resolution || resolution.trim().length < 20) {
      throw new Error('Resolution must be at least 20 characters');
    }

    if (resolution.length > 5000) {
      throw new Error('Resolution must not exceed 5000 characters');
    }

    if (!this.props.status.isUnderReview()) {
      throw new Error(
        `Cannot resolve dispute. Current status: ${this.props.status.value}. Must be "under_review".`
      );
    }

    if (!this.props.conciliatorId) {
      throw new Error(
        'Cannot resolve dispute. No conciliator assigned.'
      );
    }

    // Validar transición de estado
    const newStatus = DisputeStatus.resolved();
    this.props.status.validateTransition(newStatus);

    // Aplicar cambios
    this.props.resolution = resolution.trim();
    this.props.resolutionType = resolutionType;
    this.props.status = newStatus;
    this.props.resolvedAt = new Date();
  }

  /**
   * Cierra la disputa (después de ejecutar transacciones financieras)
   *
   * Business Rules:
   * - Solo puede cerrarse si status = resolved
   * - Cambia status a closed (estado final, inmutable)
   *
   * @throws Error si la disputa no está resuelta
   */
  close(): void {
    if (!this.props.status.isResolved()) {
      throw new Error(
        `Cannot close dispute. Current status: ${this.props.status.value}. Must be "resolved".`
      );
    }

    // Validar transición de estado
    const newStatus = DisputeStatus.closed();
    this.props.status.validateTransition(newStatus);

    // Aplicar cambios
    this.props.status = newStatus;
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Verifica si la disputa está asignada a un conciliator
   */
  isAssigned(): boolean {
    return this.props.conciliatorId !== null;
  }

  /**
   * Verifica si la disputa tiene resolución
   */
  isResolved(): boolean {
    return this.props.resolution !== null && this.props.resolutionType !== null;
  }

  /**
   * Verifica si la disputa está cerrada
   */
  isClosed(): boolean {
    return this.props.status.isClosed();
  }

  /**
   * Verifica si la disputa está abierta para asignación
   */
  isOpenForAssignment(): boolean {
    return this.props.status.isOpen() && !this.isAssigned();
  }

  /**
   * Verifica si el usuario dado es parte de la disputa
   */
  isParticipant(userId: string): boolean {
    return (
      userId === this.props.sellerId ||
      userId === this.props.providerId ||
      userId === this.props.conciliatorId
    );
  }

  /**
   * Verifica si el usuario es el conciliator asignado
   */
  isAssignedToConciliator(conciliatorId: string): boolean {
    return this.props.conciliatorId === conciliatorId;
  }

  /**
   * Verifica si el usuario abrió la disputa
   */
  isOpenedBy(userId: string): boolean {
    return (
      (this.props.openedBy === 'seller' && userId === this.props.sellerId) ||
      (this.props.openedBy === 'provider' && userId === this.props.providerId)
    );
  }

  /**
   * Calcula la duración de la disputa en días
   */
  getDurationInDays(): number {
    const endDate = this.props.resolvedAt || new Date();
    const durationMs = endDate.getTime() - this.props.createdAt.getTime();
    return Math.floor(durationMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcula el tiempo de respuesta del conciliator (desde asignación a resolución)
   */
  getResolutionTimeInHours(): number | null {
    if (!this.props.assignedAt || !this.props.resolvedAt) {
      return null;
    }

    const durationMs =
      this.props.resolvedAt.getTime() - this.props.assignedAt.getTime();
    return Math.floor(durationMs / (1000 * 60 * 60));
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
      purchaseId: this.props.purchaseId,
      sellerId: this.props.sellerId,
      providerId: this.props.providerId,
      conciliatorId: this.props.conciliatorId,
      openedBy: this.props.openedBy,
      reason: this.props.reason,
      status: this.props.status.value,
      resolution: this.props.resolution,
      resolutionType: this.props.resolutionType?.value || null,
      createdAt: this.props.createdAt,
      assignedAt: this.props.assignedAt,
      resolvedAt: this.props.resolvedAt,
    };
  }

  /**
   * Serializa para respuesta detallada (incluye metadata)
   */
  toDetailedJSON() {
    return {
      ...this.toJSON(),
      metadata: {
        isAssigned: this.isAssigned(),
        isResolved: this.isResolved(),
        isClosed: this.isClosed(),
        durationInDays: this.getDurationInDays(),
        resolutionTimeInHours: this.getResolutionTimeInHours(),
        statusDisplay: this.props.status.toDisplayString(),
        resolutionTypeDisplay: this.props.resolutionType?.toDisplayString() || null,
      },
    };
  }

  /**
   * Serializa para persistencia en Prisma
   */
  toPersistence() {
    return {
      id: this.props.id,
      orderId: this.props.purchaseId,
      sellerId: this.props.sellerId,
      providerId: this.props.providerId,
      conciliatorId: this.props.conciliatorId,
      openedBy: this.props.openedBy,
      reason: this.props.reason,
      status: this.props.status.toPersistence(),
      resolution: this.props.resolution,
      resolutionType: this.props.resolutionType?.toPersistence() || null,
      createdAt: this.props.createdAt,
      assignedAt: this.props.assignedAt,
      resolvedAt: this.props.resolvedAt,
    };
  }
}
