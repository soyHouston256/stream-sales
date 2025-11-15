import jwt, { SignOptions } from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export class JwtService {
  private secret: string;
  private expiresIn: string | number;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
    } as SignOptions);
  }

  verify(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.secret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid token');
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
