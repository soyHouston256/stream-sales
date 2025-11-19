/**
 * Rate Limiter
 * Provides protection against brute force and DoS attacks
 * Uses in-memory storage (for production, use Redis or similar)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

export class RateLimiter {
  private static attempts = new Map<string, RateLimitEntry>();
  private static readonly CLEANUP_INTERVAL = 60000; // 1 minute

  static {
    // Cleanup expired entries periodically to prevent memory leaks
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.attempts.entries()) {
        if (entry.resetTime < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
          this.attempts.delete(key);
        }
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Check if request should be rate limited
   * @param identifier - Unique identifier (IP address, user ID, email, etc.)
   * @param maxAttempts - Maximum attempts allowed in time window
   * @param windowMs - Time window in milliseconds
   * @param blockDurationMs - How long to block after exceeding limit
   */
  static isRateLimited(
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000, // 15 minutes default
    blockDurationMs: number = 15 * 60 * 1000 // 15 minutes block
  ): { limited: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    // Check if currently blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      return {
        limited: true,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }

    // If no entry or window expired, create/reset entry
    if (!entry || entry.resetTime < now) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { limited: false };
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > maxAttempts) {
      entry.blockedUntil = now + blockDurationMs;
      return {
        limited: true,
        retryAfter: Math.ceil(blockDurationMs / 1000),
      };
    }

    return { limited: false };
  }

  /**
   * Reset rate limit for an identifier (e.g., after successful login)
   */
  static reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Get current attempt count for identifier
   */
  static getAttemptCount(identifier: string): number {
    const entry = this.attempts.get(identifier);
    if (!entry || entry.resetTime < Date.now()) {
      return 0;
    }
    return entry.count;
  }

  /**
   * Manually block an identifier
   */
  static block(identifier: string, durationMs: number = 60 * 60 * 1000): void {
    const now = Date.now();
    this.attempts.set(identifier, {
      count: 999,
      resetTime: now + durationMs,
      blockedUntil: now + durationMs,
    });
  }
}
