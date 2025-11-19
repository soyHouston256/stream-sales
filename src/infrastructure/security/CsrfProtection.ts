import { randomBytes, createHmac } from 'crypto';

/**
 * CSRF Protection
 * Implements Double Submit Cookie pattern for CSRF protection
 */
export class CsrfProtection {
  private static readonly SECRET = process.env.CSRF_SECRET || this.generateSecret();
  private static readonly TOKEN_LENGTH = 32;

  /**
   * Generate a CSRF token
   */
  static generateToken(): string {
    const token = randomBytes(this.TOKEN_LENGTH).toString('hex');
    const timestamp = Date.now().toString();
    const signature = this.sign(token, timestamp);

    // Combine token, timestamp, and signature
    return `${token}.${timestamp}.${signature}`;
  }

  /**
   * Validate a CSRF token
   * @param token - The CSRF token to validate
   * @param maxAgeMs - Maximum age of token in milliseconds (default 1 hour)
   */
  static validateToken(token: string, maxAgeMs: number = 60 * 60 * 1000): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const [tokenValue, timestamp, signature] = parts;

    // Verify signature
    const expectedSignature = this.sign(tokenValue, timestamp);
    if (signature !== expectedSignature) {
      return false;
    }

    // Check if token is expired
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime)) {
      return false;
    }

    const now = Date.now();
    const tokenAge = now - tokenTime;
    if (tokenAge > maxAgeMs) {
      return false;
    }

    // Special case: if maxAge is 0, reject all tokens (no age is acceptable)
    if (maxAgeMs === 0 && tokenAge >= 0) {
      return false;
    }

    return true;
  }

  /**
   * Sign token with timestamp using HMAC
   */
  private static sign(token: string, timestamp: string): string {
    return createHmac('sha256', this.SECRET)
      .update(`${token}.${timestamp}`)
      .digest('hex');
  }

  /**
   * Generate a random secret (fallback if env var not set)
   */
  private static generateSecret(): string {
    console.warn('CSRF_SECRET not set in environment, using random secret (will invalidate tokens on restart)');
    return randomBytes(32).toString('hex');
  }
}
