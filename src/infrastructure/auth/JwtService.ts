import jwt, { SignOptions } from 'jsonwebtoken';
import { TokenBlacklist } from '../security/TokenBlacklist';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class JwtService {
  private secret: string;
  private expiresIn: string | number;

  constructor() {
    // SECURITY: Fail fast if JWT_SECRET is not configured
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required for security');
    }

    // SECURITY: Ensure secret is strong enough (minimum 32 characters)
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    this.secret = process.env.JWT_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      algorithm: 'HS256', // SECURITY: Explicitly specify algorithm to prevent algorithm confusion attacks
    } as SignOptions);
  }

  verify(token: string): JwtPayload {
    try {
      // SECURITY: Check if token is blacklisted (logged out)
      if (TokenBlacklist.isBlacklisted(token)) {
        throw new Error('Token has been revoked');
      }

      // SECURITY: Explicitly specify allowed algorithms to prevent algorithm confusion attacks
      return jwt.verify(token, this.secret, { algorithms: ['HS256'] }) as JwtPayload;
    } catch (error) {
      if (error instanceof Error && error.message === 'Token has been revoked') {
        throw error;
      }
      throw new Error('Invalid token');
    }
  }

  /**
   * Revoke a token (add to blacklist)
   */
  revoke(token: string): void {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (decoded && decoded.exp) {
        // Blacklist until natural expiration
        TokenBlacklist.add(token, decoded.exp * 1000);
      }
    } catch (error) {
      // If token can't be decoded, ignore
    }
  }

  decode(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}
