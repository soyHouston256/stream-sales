export interface DisputeMessageProps {
  id: string;
  disputeId: string;
  senderId: string;
  message: string;
  attachments: string[] | null; // Array de URLs de archivos adjuntos
  isInternal: boolean; // Notas internas del conciliator (solo visibles para conciliators)
  createdAt: Date;
}

/**
 * DisputeMessage Entity
 *
 * Representa un mensaje en la conversación de una disputa.
 *
 * Reglas de negocio:
 * 1. Seller, Provider y Conciliator pueden enviar mensajes
 * 2. Solo Conciliator puede enviar mensajes internos (isInternal: true)
 * 3. Mensajes internos solo son visibles para conciliators
 * 4. Mensajes son INMUTABLES (no se pueden editar ni eliminar)
 * 5. Mensajes pueden tener attachments (URLs de imágenes, screenshots, etc.)
 * 6. Mensaje debe tener mínimo 5 caracteres
 *
 * Visibilidad:
 * - Mensajes públicos (isInternal: false): Visibles para seller, provider y conciliator
 * - Mensajes internos (isInternal: true): Solo visibles para conciliators (notas privadas)
 *
 * @example
 * // Mensaje público del seller
 * const message = DisputeMessage.create({
 *   disputeId: 'dispute123',
 *   senderId: 'seller456',
 *   message: 'The account credentials do not work. I tried multiple times.',
 *   attachments: ['https://cdn.example.com/screenshot1.png']
 * });
 *
 * // Nota interna del conciliator
 * const internalNote = DisputeMessage.createInternal({
 *   disputeId: 'dispute123',
 *   senderId: 'conciliator001',
 *   message: 'Verified with provider. Credentials were changed after purchase.'
 * });
 */
export class DisputeMessage {
  private props: DisputeMessageProps;

  private constructor(props: DisputeMessageProps) {
    this.props = props;
    Object.freeze(this);
  }

  /**
   * Crea un mensaje público (visible para todas las partes)
   *
   * @param disputeId - ID de la disputa
   * @param senderId - ID del usuario que envía el mensaje
   * @param message - Contenido del mensaje
   * @param attachments - Array opcional de URLs de archivos adjuntos
   */
  static create(data: {
    disputeId: string;
    senderId: string;
    message: string;
    attachments?: string[];
  }): DisputeMessage {
    // Validaciones
    if (!data.disputeId || data.disputeId.trim().length === 0) {
      throw new Error('Dispute ID is required');
    }

    if (!data.senderId || data.senderId.trim().length === 0) {
      throw new Error('Sender ID is required');
    }

    if (!data.message || data.message.trim().length < 5) {
      throw new Error('Message must be at least 5 characters');
    }

    if (data.message.length > 5000) {
      throw new Error('Message must not exceed 5000 characters');
    }

    // Validar attachments si existen
    const attachments = data.attachments || null;
    if (attachments && attachments.length > 10) {
      throw new Error('Cannot attach more than 10 files');
    }

    if (attachments) {
      attachments.forEach((url) => {
        if (!this.isValidURL(url)) {
          throw new Error(`Invalid attachment URL: ${url}`);
        }
      });
    }

    return new DisputeMessage({
      id: crypto.randomUUID(),
      disputeId: data.disputeId,
      senderId: data.senderId,
      message: data.message.trim(),
      attachments,
      isInternal: false,
      createdAt: new Date(),
    });
  }

  /**
   * Crea un mensaje interno (solo visible para conciliators)
   *
   * @param disputeId - ID de la disputa
   * @param senderId - ID del conciliator que envía la nota
   * @param message - Contenido de la nota interna
   */
  static createInternal(data: {
    disputeId: string;
    senderId: string;
    message: string;
  }): DisputeMessage {
    // Reutilizar validaciones de create
    const publicMessage = this.create({
      ...data,
      attachments: [],
    });

    return new DisputeMessage({
      ...publicMessage.props,
      isInternal: true,
    });
  }

  /**
   * Reconstruye DisputeMessage desde persistencia
   */
  static fromPersistence(props: DisputeMessageProps): DisputeMessage {
    return new DisputeMessage(props);
  }

  // ============================================
  // VALIDACIONES PRIVADAS
  // ============================================

  private static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // GETTERS
  // ============================================

  get id(): string {
    return this.props.id;
  }

  get disputeId(): string {
    return this.props.disputeId;
  }

  get senderId(): string {
    return this.props.senderId;
  }

  get message(): string {
    return this.props.message;
  }

  get attachments(): string[] | null {
    return this.props.attachments;
  }

  get isInternal(): boolean {
    return this.props.isInternal;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Verifica si el mensaje es público (visible para todas las partes)
   */
  isPublic(): boolean {
    return !this.props.isInternal;
  }

  /**
   * Verifica si el mensaje tiene attachments
   */
  hasAttachments(): boolean {
    return this.props.attachments !== null && this.props.attachments.length > 0;
  }

  /**
   * Obtiene el número de attachments
   */
  getAttachmentCount(): number {
    return this.props.attachments?.length || 0;
  }

  /**
   * Verifica si el usuario es el autor del mensaje
   */
  isSentBy(userId: string): boolean {
    return this.props.senderId === userId;
  }

  /**
   * Verifica si el mensaje es visible para el usuario dado
   *
   * Reglas:
   * - Mensajes públicos: visibles para todos los participantes
   * - Mensajes internos: solo visibles para conciliators
   *
   * @param userId - ID del usuario
   * @param userRole - Rol del usuario (para verificar si es conciliator)
   */
  isVisibleTo(userId: string, userRole: string): boolean {
    // Mensajes públicos son visibles para todos
    if (this.isPublic()) {
      return true;
    }

    // Mensajes internos solo para conciliators
    return userRole === 'conciliator';
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
      disputeId: this.props.disputeId,
      senderId: this.props.senderId,
      message: this.props.message,
      attachments: this.props.attachments,
      isInternal: this.props.isInternal,
      createdAt: this.props.createdAt,
    };
  }

  /**
   * Serializa con información adicional para UI
   */
  toDetailedJSON(senderName?: string) {
    return {
      ...this.toJSON(),
      metadata: {
        hasAttachments: this.hasAttachments(),
        attachmentCount: this.getAttachmentCount(),
        isPublic: this.isPublic(),
        senderName: senderName || 'Unknown',
      },
    };
  }

  /**
   * Serializa para persistencia en Prisma
   */
  toPersistence() {
    return {
      id: this.props.id,
      disputeId: this.props.disputeId,
      senderId: this.props.senderId,
      message: this.props.message,
      attachments: this.props.attachments || [], // Prisma Json field
      isInternal: this.props.isInternal,
      createdAt: this.props.createdAt,
    };
  }
}
