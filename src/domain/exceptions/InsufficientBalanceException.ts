/**
 * InsufficientBalanceException
 *
 * Se lanza cuando se intenta debitar más dinero del disponible en la Wallet.
 *
 * Casos de uso:
 * - Compra de producto sin saldo suficiente
 * - Transferencia P2P excede balance
 * - Retiro mayor al disponible
 *
 * HTTP Status recomendado: 402 Payment Required
 */
export class InsufficientBalanceException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientBalanceException';
    Object.setPrototypeOf(this, InsufficientBalanceException.prototype);
  }
}
