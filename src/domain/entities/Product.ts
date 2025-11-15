import { Money } from '../value-objects/Money';
import { ProductStatus } from '../value-objects/ProductStatus';

export interface ProductProps {
  id: string;
  providerId: string;
  category: string;
  price: Money;
  accountEmail: string;
  accountPassword: string; // MUST be encrypted in persistence
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
  soldAt?: Date;
  soldToUserId?: string;
}

/**
 * Product Entity (Aggregate Root)
 *
 * Representa un producto digital (cuenta de servicio) en el marketplace.
 *
 * Reglas de negocio críticas:
 * 1. Un producto solo puede ser vendido UNA VEZ (status = sold es final)
 * 2. accountPassword DEBE estar encriptado en persistencia
 * 3. Solo provider owner puede editar el producto
 * 4. Price debe ser positivo
 * 5. Status transitions deben ser válidas
 * 6. Producto sold NO puede ser modificado ni eliminado
 *
 * Categorías válidas:
 * - netflix, spotify, hbo, disney, amazon-prime, youtube-premium, etc.
 *
 * @example
 * const product = Product.create({
 *   providerId: 'user123',
 *   category: 'netflix',
 *   price: Money.create(15.99),
 *   accountEmail: 'account@example.com',
 *   accountPassword: 'encrypted_password'
 * });
 */
export class Product {
  private constructor(private props: ProductProps) {}

  /**
   * Crea un nuevo Product
   * Status inicial = AVAILABLE
   */
  static create(data: {
    providerId: string;
    category: string;
    price: Money;
    accountEmail: string;
    accountPassword: string;
  }): Product {
    // Validaciones
    if (!data.category || data.category.trim().length === 0) {
      throw new Error('Product category is required');
    }

    if (!data.accountEmail || data.accountEmail.trim().length === 0) {
      throw new Error('Account email is required');
    }

    if (!data.accountPassword || data.accountPassword.trim().length === 0) {
      throw new Error('Account password is required');
    }

    if (!data.price.isPositive()) {
      throw new Error('Product price must be positive');
    }

    return new Product({
      id: crypto.randomUUID(),
      providerId: data.providerId,
      category: data.category.toLowerCase().trim(),
      price: data.price,
      accountEmail: data.accountEmail.trim(),
      accountPassword: data.accountPassword, // Will be encrypted in repository
      status: ProductStatus.available(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Reconstruye Product desde persistencia
   */
  static fromPersistence(props: ProductProps): Product {
    return new Product(props);
  }

  // ============================================
  // GETTERS
  // ============================================

  get id(): string {
    return this.props.id;
  }

  get providerId(): string {
    return this.props.providerId;
  }

  get category(): string {
    return this.props.category;
  }

  get price(): Money {
    return this.props.price;
  }

  get accountEmail(): string {
    return this.props.accountEmail;
  }

  get accountPassword(): string {
    return this.props.accountPassword;
  }

  get status(): ProductStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get soldAt(): Date | undefined {
    return this.props.soldAt;
  }

  get soldToUserId(): string | undefined {
    return this.props.soldToUserId;
  }

  // ============================================
  // DOMAIN OPERATIONS
  // ============================================

  /**
   * Reserva el producto durante proceso de compra
   * Transición: AVAILABLE -> RESERVED
   *
   * @throws Error si el producto no puede ser reservado
   */
  reserve(): void {
    if (!this.props.status.canBePurchased()) {
      throw new Error(`Cannot reserve product with status ${this.props.status.value}`);
    }

    const newStatus = ProductStatus.reserved();
    this.props.status.validateTransition(newStatus);

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  /**
   * Marca el producto como vendido
   * Transición: RESERVED -> SOLD
   *
   * @param buyerUserId - ID del usuario que compró el producto
   * @throws Error si la transición no es válida
   */
  markAsSold(buyerUserId: string): void {
    if (!buyerUserId || buyerUserId.trim().length === 0) {
      throw new Error('Buyer user ID is required');
    }

    const newStatus = ProductStatus.sold();
    this.props.status.validateTransition(newStatus);

    this.props.status = newStatus;
    this.props.soldAt = new Date();
    this.props.soldToUserId = buyerUserId;
    this.props.updatedAt = new Date();
  }

  /**
   * Cancela la reserva del producto
   * Transición: RESERVED -> AVAILABLE
   *
   * Casos de uso:
   * - Usuario cancela compra
   * - Timeout de reserva
   * - Fallo en el pago
   */
  cancelReservation(): void {
    if (!this.props.status.isReserved()) {
      throw new Error('Cannot cancel reservation: product is not reserved');
    }

    const newStatus = ProductStatus.available();
    this.props.status.validateTransition(newStatus);

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  /**
   * Suspende el producto (acción de admin)
   * Transición: AVAILABLE -> SUSPENDED
   *
   * Casos de uso:
   * - Reporte de fraude
   * - Violación de términos
   * - Investigación en curso
   */
  suspend(): void {
    if (!this.props.status.isAvailable()) {
      throw new Error('Can only suspend available products');
    }

    const newStatus = ProductStatus.suspended();
    this.props.status.validateTransition(newStatus);

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  /**
   * Reactiva un producto suspendido
   * Transición: SUSPENDED -> AVAILABLE
   */
  reactivate(): void {
    if (!this.props.status.isSuspended()) {
      throw new Error('Can only reactivate suspended products');
    }

    const newStatus = ProductStatus.available();
    this.props.status.validateTransition(newStatus);

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  /**
   * Actualiza las credenciales del producto
   *
   * @throws Error si el producto no puede ser editado (ej: vendido)
   */
  updateCredentials(accountEmail: string, accountPassword: string): void {
    if (!this.props.status.canBeEdited()) {
      throw new Error(`Cannot edit product with status ${this.props.status.value}`);
    }

    if (!accountEmail || accountEmail.trim().length === 0) {
      throw new Error('Account email is required');
    }

    if (!accountPassword || accountPassword.trim().length === 0) {
      throw new Error('Account password is required');
    }

    this.props.accountEmail = accountEmail.trim();
    this.props.accountPassword = accountPassword;
    this.props.updatedAt = new Date();
  }

  /**
   * Actualiza el precio del producto
   *
   * @throws Error si el producto no puede ser editado
   * @throws Error si el precio no es positivo
   */
  updatePrice(newPrice: Money): void {
    if (!this.props.status.canBeEdited()) {
      throw new Error(`Cannot edit product with status ${this.props.status.value}`);
    }

    if (!newPrice.isPositive()) {
      throw new Error('Product price must be positive');
    }

    this.props.price = newPrice;
    this.props.updatedAt = new Date();
  }

  /**
   * Actualiza la categoría del producto
   *
   * @throws Error si el producto no puede ser editado
   */
  updateCategory(newCategory: string): void {
    if (!this.props.status.canBeEdited()) {
      throw new Error(`Cannot edit product with status ${this.props.status.value}`);
    }

    if (!newCategory || newCategory.trim().length === 0) {
      throw new Error('Category is required');
    }

    this.props.category = newCategory.toLowerCase().trim();
    this.props.updatedAt = new Date();
  }

  /**
   * Verifica si el usuario es el owner del producto
   */
  isOwnedBy(userId: string): boolean {
    return this.props.providerId === userId;
  }

  /**
   * Verifica si el producto puede ser comprado
   */
  canBePurchased(): boolean {
    return this.props.status.canBePurchased();
  }

  /**
   * Verifica si el producto puede ser editado
   */
  canBeEdited(): boolean {
    return this.props.status.canBeEdited();
  }

  /**
   * Verifica si el producto puede ser eliminado
   */
  canBeDeleted(): boolean {
    return this.props.status.canBeDeleted();
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  /**
   * Serializa para respuestas de API
   * IMPORTANTE: NO incluye accountPassword en la respuesta pública
   */
  toJSON() {
    return {
      id: this.props.id,
      providerId: this.props.providerId,
      category: this.props.category,
      price: this.props.price.toPlainString(),
      currency: this.props.price.currency,
      accountEmail: this.props.accountEmail,
      // accountPassword omitido intencionalmente por seguridad
      status: this.props.status.value,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      soldAt: this.props.soldAt,
      soldToUserId: this.props.soldToUserId,
    };
  }

  /**
   * Serializa para respuesta de compra exitosa
   * Incluye credentials solo para el comprador
   */
  toJSONWithCredentials() {
    return {
      ...this.toJSON(),
      accountPassword: this.props.accountPassword,
    };
  }

  /**
   * Serializa para persistencia en Prisma
   */
  toPersistence() {
    return {
      id: this.props.id,
      providerId: this.props.providerId,
      category: this.props.category,
      price: this.props.price.amount, // Decimal para Prisma
      currency: this.props.price.currency,
      accountEmail: this.props.accountEmail,
      accountPassword: this.props.accountPassword, // Ya debe estar encriptado
      status: this.props.status.value,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      soldAt: this.props.soldAt,
      soldToUserId: this.props.soldToUserId,
    };
  }
}
