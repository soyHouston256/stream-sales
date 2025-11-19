import { CsrfProtection } from '../CsrfProtection';

describe('CsrfProtection', () => {
  describe('generateToken', () => {
    it('should generate a token', () => {
      const token = CsrfProtection.generateToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = CsrfProtection.generateToken();
      const token2 = CsrfProtection.generateToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate token with correct format', () => {
      const token = CsrfProtection.generateToken();
      const parts = token.split('.');
      expect(parts).toHaveLength(3); // token.timestamp.signature
    });
  });

  describe('validateToken', () => {
    it('should validate a fresh token', () => {
      const token = CsrfProtection.generateToken();
      const isValid = CsrfProtection.validateToken(token);
      expect(isValid).toBe(true);
    });

    it('should reject invalid token format', () => {
      expect(CsrfProtection.validateToken('invalid')).toBe(false);
      expect(CsrfProtection.validateToken('a.b')).toBe(false);
      expect(CsrfProtection.validateToken('')).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(CsrfProtection.validateToken(null as any)).toBe(false);
      expect(CsrfProtection.validateToken(undefined as any)).toBe(false);
    });

    it('should reject tampered tokens', () => {
      const token = CsrfProtection.generateToken();
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.wrongsignature`;

      expect(CsrfProtection.validateToken(tamperedToken)).toBe(false);
    });

    it('should reject expired tokens', () => {
      const token = CsrfProtection.generateToken();

      // Validate with a very short max age (token will be expired)
      const isValid = CsrfProtection.validateToken(token, 0);
      expect(isValid).toBe(false);
    });

    it('should accept token within max age', () => {
      const token = CsrfProtection.generateToken();

      // Validate with a long max age
      const isValid = CsrfProtection.validateToken(token, 60 * 60 * 1000);
      expect(isValid).toBe(true);
    });
  });
});
