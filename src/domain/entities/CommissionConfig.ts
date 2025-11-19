import { Decimal } from "decimal.js";

/**
 * Commission Configuration Types
 */
export type CommissionType = 'sale' | 'registration';

export interface CommissionConfigProps {
  id: string;
  type: CommissionType;
  rate: Decimal; // Stored as 0-100 (e.g., 5.50 = 5.5%)
  isActive: boolean;
  effectiveFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CommissionConfig Entity
 * Represents the commission configuration for different types of operations
 * in the system (sales, registrations, etc.)
 */
export class CommissionConfig {
  private constructor(private readonly props: CommissionConfigProps) {
    this.validate();
  }

  private validate(): void {
    if (!this.props.id || this.props.id.trim() === '') {
      throw new Error('Commission config ID is required');
    }

    if (!['sale', 'registration'].includes(this.props.type)) {
      throw new Error('Commission type must be "sale" or "registration"');
    }

    if (this.props.rate.lessThan(0) || this.props.rate.greaterThan(100)) {
      throw new Error('Commission rate must be between 0 and 100');
    }
  }

  /**
   * Reconstruct CommissionConfig from persistence
   */
  static fromPersistence(data: {
    id: string;
    type: string;
    rate: Decimal | number | string;
    isActive: boolean;
    effectiveFrom: Date;
    createdAt: Date;
    updatedAt: Date;
  }): CommissionConfig {
    const rate = data.rate instanceof Decimal ? data.rate : new Decimal(String(data.rate));

    return new CommissionConfig({
      id: data.id,
      type: data.type as CommissionType,
      rate,
      isActive: data.isActive,
      effectiveFrom: data.effectiveFrom,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  /**
   * Create new CommissionConfig
   */
  static create(data: {
    type: CommissionType;
    rate: number | string | Decimal;
    effectiveFrom?: Date;
  }): CommissionConfig {
    const rate = data.rate instanceof Decimal ? data.rate : new Decimal(data.rate.toString());

    return new CommissionConfig({
      id: crypto.randomUUID(),
      type: data.type,
      rate,
      isActive: true,
      effectiveFrom: data.effectiveFrom || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get type(): CommissionType {
    return this.props.type;
  }

  get rate(): Decimal {
    return this.props.rate;
  }

  /**
   * Get rate as decimal for calculations (e.g., 5.00 -> 0.05)
   */
  get rateAsDecimal(): Decimal {
    return this.props.rate.dividedBy(100);
  }

  /**
   * Get rate as percentage string (e.g., "5.00%")
   */
  get rateAsPercentage(): string {
    return `${this.props.rate.toFixed(2)}%`;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get effectiveFrom(): Date {
    return this.props.effectiveFrom;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Deactivate this configuration
   */
  deactivate(): CommissionConfig {
    return new CommissionConfig({
      ...this.props,
      isActive: false,
      updatedAt: new Date(),
    });
  }

  /**
   * Check if this configuration is currently effective
   */
  isEffective(atDate: Date = new Date()): boolean {
    return this.props.isActive && this.props.effectiveFrom <= atDate;
  }

  /**
   * Convert to persistence format
   */
  toPersistence() {
    return {
      id: this.props.id,
      type: this.props.type,
      rate: this.props.rate,
      isActive: this.props.isActive,
      effectiveFrom: this.props.effectiveFrom,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
