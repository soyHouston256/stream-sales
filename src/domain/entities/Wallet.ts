import { Money } from '../value-objects/Money';
import { InsufficientBalanceException } from '../exceptions/InsufficientBalanceException';

export interface WalletProps {
  id: string;
  userId: string;
  balance: Money;
  status: WalletStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum WalletStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  CLOSED = 'closed',
}

/**
 * Wallet Entity (Aggregate Root)
 *
 * Representa la billetera digital de un usuario.
 *
 * Reglas de negocio críticas:
 * 1. Balance NUNCA puede ser negativo (validar antes de débito)
 * 2. Solo wallets ACTIVE pueden realizar operaciones
 * 3. Todas las operaciones monetarias deben registrarse como Transaction
 * 4. Un usuario solo puede tener UNA wallet
 * 5. Operaciones de crédito/débito son atómicas
 *
 * @example
 * const wallet = Wallet.create({ userId: 'user123' });
 * wallet.credit(Money.create(100)); // +$100
 * wallet.debit(Money.create(50));   // -$50
 * console.log(wallet.balance.toString()); // "$50.00"
 */
export class Wallet {
  private constructor(private props: WalletProps) {}

  /**
   * Crea una nueva Wallet
   * Balance inicial = 0, Status = ACTIVE
   */
  static create(data: { userId: string; currency?: string }): Wallet {
    return new Wallet({
      id: crypto.randomUUID(),
      userId: data.userId,
      balance: Money.create(0, data.currency || 'USD'),
      status: WalletStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Reconstruye Wallet desde persistencia
   */
  static fromPersistence(props: WalletProps): Wallet {
    return new Wallet(props);
  }

  // ============================================
  // GETTERS
  // ============================================

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get balance(): Money {
    return this.props.balance;
  }

  get status(): WalletStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ============================================
  // DOMAIN OPERATIONS
  // ============================================

  /**
   * Acredita dinero a la wallet (aumenta balance)
   *
   * Casos de uso:
   * - Recarga de saldo
   * - Ingresos de Provider al vender producto
   * - Transferencia recibida
   *
   * @throws Error si la wallet no está activa
   */
  credit(amount: Money): void {
    this.assertIsActive();
    this.assertSameCurrency(amount);

    this.props.balance = this.props.balance.add(amount);
    this.props.updatedAt = new Date();
  }

  /**
   * Debita dinero de la wallet (disminuye balance)
   *
   * Casos de uso:
   * - Compra de producto
   * - Transferencia enviada
   * - Pago de comisiones
   *
   * @throws InsufficientBalanceException si balance < amount
   * @throws Error si la wallet no está activa
   */
  debit(amount: Money): void {
    this.assertIsActive();
    this.assertSameCurrency(amount);
    this.assertSufficientBalance(amount);

    this.props.balance = this.props.balance.subtract(amount);
    this.props.updatedAt = new Date();
  }

  /**
   * Verifica si tiene saldo suficiente para un débito
   */
  hasSufficientBalance(amount: Money): boolean {
    this.assertSameCurrency(amount);
    return this.props.balance.isGreaterThanOrEqual(amount);
  }

  /**
   * Congela la wallet (impide operaciones)
   *
   * Casos de uso:
   * - Actividad sospechosa
   * - Dispute en progreso
   * - Sanción administrativa
   */
  freeze(): void {
    if (this.props.status === WalletStatus.CLOSED) {
      throw new Error('Cannot freeze a closed wallet');
    }

    this.props.status = WalletStatus.FROZEN;
    this.props.updatedAt = new Date();
  }

  /**
   * Reactiva una wallet congelada
   */
  activate(): void {
    if (this.props.status === WalletStatus.CLOSED) {
      throw new Error('Cannot activate a closed wallet');
    }

    this.props.status = WalletStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  /**
   * Cierra la wallet permanentemente
   *
   * Requisitos:
   * - Balance debe ser 0
   *
   * @throws Error si balance no es cero
   */
  close(): void {
    if (!this.props.balance.isZero()) {
      throw new Error('Cannot close wallet with non-zero balance. Please withdraw all funds first.');
    }

    this.props.status = WalletStatus.CLOSED;
    this.props.updatedAt = new Date();
  }

  /**
   * Verifica si la wallet está activa
   */
  isActive(): boolean {
    return this.props.status === WalletStatus.ACTIVE;
  }

  /**
   * Verifica si la wallet está congelada
   */
  isFrozen(): boolean {
    return this.props.status === WalletStatus.FROZEN;
  }

  /**
   * Verifica si la wallet está cerrada
   */
  isClosed(): boolean {
    return this.props.status === WalletStatus.CLOSED;
  }

  // ============================================
  // VALIDATIONS
  // ============================================

  /**
   * Valida que la wallet esté activa
   */
  private assertIsActive(): void {
    if (this.props.status !== WalletStatus.ACTIVE) {
      throw new Error(`Wallet is ${this.props.status}. Only active wallets can perform transactions.`);
    }
  }

  /**
   * Valida que haya saldo suficiente
   */
  private assertSufficientBalance(amount: Money): void {
    if (!this.hasSufficientBalance(amount)) {
      throw new InsufficientBalanceException(
        `Insufficient balance. Available: ${this.props.balance.toString()}, Required: ${amount.toString()}`
      );
    }
  }

  /**
   * Valida que la moneda sea la misma que la de la wallet
   */
  private assertSameCurrency(amount: Money): void {
    if (amount.currency !== this.props.balance.currency) {
      throw new Error(
        `Currency mismatch. Wallet uses ${this.props.balance.currency}, but received ${amount.currency}`
      );
    }
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
      userId: this.props.userId,
      balance: this.props.balance.toPlainString(),
      currency: this.props.balance.currency,
      status: this.props.status,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }

  /**
   * Serializa para persistencia en Prisma
   */
  toPersistence() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      balance: this.props.balance.amount, // Decimal para Prisma
      currency: this.props.balance.currency,
      status: this.props.status,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
