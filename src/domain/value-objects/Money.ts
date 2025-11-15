import { Decimal } from '@prisma/client/runtime/library';

export interface MoneyProps {
  amount: Decimal;
  currency: string;
}

/**
 * Money Value Object
 *
 * Representa un valor monetario con precisión decimal.
 *
 * Reglas de negocio:
 * - NUNCA usar Float - siempre Decimal con 4 decimales
 * - Inmutable - toda operación retorna nuevo Money
 * - Operaciones solo entre misma moneda
 * - No permite valores negativos (usar en conjunto con validaciones de negocio)
 *
 * @example
 * const price = Money.create(15.99, 'USD');
 * const total = price.add(Money.create(5.00, 'USD'));
 * console.log(total.toString()); // "$21.99"
 */
export class Money {
  private constructor(private readonly props: MoneyProps) {
    Object.freeze(this);
  }

  /**
   * Crea una instancia de Money
   * @param amount - Cantidad como number, string o Decimal
   * @param currency - Código de moneda ISO 4217 (default: USD)
   * @throws Error si el amount no es válido o currency es inválida
   */
  static create(amount: number | string | Decimal, currency = 'USD'): Money {
    // Validar currency
    const validCurrencies = ['USD', 'EUR', 'GBP', 'MXN', 'COP', 'ARS'];
    if (!validCurrencies.includes(currency.toUpperCase())) {
      throw new Error(`Invalid currency: ${currency}. Supported: ${validCurrencies.join(', ')}`);
    }

    // Convertir a Decimal
    let decimalAmount: Decimal;
    try {
      if (amount instanceof Decimal) {
        decimalAmount = amount;
      } else {
        decimalAmount = new Decimal(amount);
      }
    } catch (error) {
      throw new Error(`Invalid amount: ${amount}. Must be a valid number or decimal string.`);
    }

    // Validar que no sea NaN o Infinity
    if (!decimalAmount.isFinite()) {
      throw new Error(`Invalid amount: ${amount}. Must be a finite number.`);
    }

    // Redondear a 4 decimales (precisión de la BD)
    decimalAmount = decimalAmount.toDecimalPlaces(4);

    return new Money({
      amount: decimalAmount,
      currency: currency.toUpperCase(),
    });
  }

  /**
   * Crea Money desde un valor almacenado en Prisma
   */
  static fromPersistence(amount: Decimal, currency: string): Money {
    return new Money({
      amount,
      currency: currency.toUpperCase(),
    });
  }

  /**
   * Suma dos valores Money
   * @throws Error si las monedas no coinciden
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);

    const newAmount = this.props.amount.plus(other.props.amount);
    return Money.fromPersistence(newAmount, this.props.currency);
  }

  /**
   * Resta dos valores Money
   * @throws Error si las monedas no coinciden
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);

    const newAmount = this.props.amount.minus(other.props.amount);
    return Money.fromPersistence(newAmount, this.props.currency);
  }

  /**
   * Multiplica por un factor
   * Útil para cálculos de comisiones (ej: amount * 0.05 para 5%)
   */
  multiply(factor: number | string | Decimal): Money {
    const decimalFactor = factor instanceof Decimal ? factor : new Decimal(factor);
    const newAmount = this.props.amount.times(decimalFactor).toDecimalPlaces(4);
    return Money.fromPersistence(newAmount, this.props.currency);
  }

  /**
   * Divide por un divisor
   */
  divide(divisor: number | string | Decimal): Money {
    const decimalDivisor = divisor instanceof Decimal ? divisor : new Decimal(divisor);

    if (decimalDivisor.isZero()) {
      throw new Error('Cannot divide by zero');
    }

    const newAmount = this.props.amount.dividedBy(decimalDivisor).toDecimalPlaces(4);
    return Money.fromPersistence(newAmount, this.props.currency);
  }

  /**
   * Compara si dos Money son iguales (mismo monto y moneda)
   */
  equals(other: Money): boolean {
    return (
      this.props.amount.equals(other.props.amount) &&
      this.props.currency === other.props.currency
    );
  }

  /**
   * Verifica si este Money es mayor que otro
   * @throws Error si las monedas no coinciden
   */
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.amount.greaterThan(other.props.amount);
  }

  /**
   * Verifica si este Money es menor que otro
   * @throws Error si las monedas no coinciden
   */
  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.amount.lessThan(other.props.amount);
  }

  /**
   * Verifica si este Money es mayor o igual que otro
   * @throws Error si las monedas no coinciden
   */
  isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.amount.greaterThanOrEqualTo(other.props.amount);
  }

  /**
   * Verifica si el monto es cero
   */
  isZero(): boolean {
    return this.props.amount.isZero();
  }

  /**
   * Verifica si el monto es positivo (mayor que cero)
   */
  isPositive(): boolean {
    return this.props.amount.isPositive() && !this.props.amount.isZero();
  }

  /**
   * Verifica si el monto es negativo
   */
  isNegative(): boolean {
    return this.props.amount.isNegative();
  }

  /**
   * Obtiene el valor absoluto
   */
  abs(): Money {
    return Money.fromPersistence(this.props.amount.abs(), this.props.currency);
  }

  /**
   * Obtiene el monto como Decimal (para persistencia en Prisma)
   */
  get amount(): Decimal {
    return this.props.amount;
  }

  /**
   * Obtiene el código de moneda
   */
  get currency(): string {
    return this.props.currency;
  }

  /**
   * Convierte a number (usar con precaución - puede perder precisión)
   */
  toNumber(): number {
    return this.props.amount.toNumber();
  }

  /**
   * Convierte a string con formato
   * @example Money.create(1234.56).toString() => "$1,234.56"
   */
  toString(): string {
    const formatted = this.props.amount.toFixed(2);
    const [intPart, decPart] = formatted.split('.');
    const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    const symbol = this.getCurrencySymbol();
    return `${symbol}${intWithCommas}.${decPart}`;
  }

  /**
   * Convierte a string sin formato (para API responses)
   */
  toPlainString(): string {
    return this.props.amount.toFixed(4);
  }

  /**
   * Serializa para JSON (usado en toJSON de entidades)
   */
  toJSON() {
    return {
      amount: this.toPlainString(),
      currency: this.props.currency,
    };
  }

  /**
   * Obtiene el símbolo de la moneda
   */
  private getCurrencySymbol(): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      MXN: '$',
      COP: '$',
      ARS: '$',
    };
    return symbols[this.props.currency] || this.props.currency;
  }

  /**
   * Valida que dos Money tengan la misma moneda
   */
  private assertSameCurrency(other: Money): void {
    if (this.props.currency !== other.props.currency) {
      throw new Error(
        `Currency mismatch: cannot operate ${this.props.currency} with ${other.props.currency}`
      );
    }
  }
}
