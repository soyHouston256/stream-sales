/**
 * Token Blacklist
 * Manages invalidated JWT tokens (for logout functionality)
 * In production, use Redis or similar distributed cache
 */

interface BlacklistedToken {
  token: string;
  expiresAt: number;
}

export class TokenBlacklist {
  private static blacklist = new Map<string, BlacklistedToken>();
  private static readonly CLEANUP_INTERVAL = 60000; // 1 minute

  static {
    // Cleanup expired tokens periodically
    setInterval(() => {
      const now = Date.now();
      for (const [token, entry] of this.blacklist.entries()) {
        if (entry.expiresAt < now) {
          this.blacklist.delete(token);
        }
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Add token to blacklist
   * @param token - JWT token to blacklist
   * @param expiresAt - When the token naturally expires (Unix timestamp)
   */
  static add(token: string, expiresAt: number): void {
    this.blacklist.set(token, {
      token,
      expiresAt,
    });
  }

  /**
   * Check if token is blacklisted
   */
  static isBlacklisted(token: string): boolean {
    const entry = this.blacklist.get(token);

    if (!entry) {
      return false;
    }

    // If token has naturally expired, remove from blacklist
    if (entry.expiresAt < Date.now()) {
      this.blacklist.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Remove token from blacklist (if needed)
   */
  static remove(token: string): void {
    this.blacklist.delete(token);
  }

  /**
   * Clear all blacklisted tokens (for testing)
   */
  static clear(): void {
    this.blacklist.clear();
  }

  /**
   * Get count of blacklisted tokens
   */
  static count(): number {
    return this.blacklist.size;
  }
}
