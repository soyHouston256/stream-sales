import { JwtService, type JwtPayload } from './JwtService';

const jwtService = new JwtService();

/**
 * Helper function to verify JWT tokens
 * Used by API routes for authentication
 */
export function verifyJWT(token: string): JwtPayload {
  return jwtService.verify(token);
}

/**
 * Helper function to sign JWT tokens
 * Used by auth endpoints
 */
export function signJWT(payload: JwtPayload): string {
  return jwtService.sign(payload);
}

/**
 * Helper function to decode JWT tokens without verification
 */
export function decodeJWT(token: string): JwtPayload | null {
  return jwtService.decode(token);
}

export type { JwtPayload };
