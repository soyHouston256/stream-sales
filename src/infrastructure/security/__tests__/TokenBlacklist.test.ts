import { TokenBlacklist } from '../TokenBlacklist';

describe('TokenBlacklist', () => {
  beforeEach(() => {
    TokenBlacklist.clear();
  });

  describe('add and isBlacklisted', () => {
    it('should blacklist a token', () => {
      const token = 'test-token-123';
      const expiresAt = Date.now() + 60000; // 1 minute from now

      TokenBlacklist.add(token, expiresAt);

      expect(TokenBlacklist.isBlacklisted(token)).toBe(true);
    });

    it('should return false for non-blacklisted token', () => {
      expect(TokenBlacklist.isBlacklisted('unknown-token')).toBe(false);
    });

    it('should remove expired tokens automatically', () => {
      const token = 'expired-token';
      const expiresAt = Date.now() - 1000; // 1 second ago

      TokenBlacklist.add(token, expiresAt);

      expect(TokenBlacklist.isBlacklisted(token)).toBe(false);
    });

    it('should handle multiple tokens', () => {
      const token1 = 'token-1';
      const token2 = 'token-2';
      const expiresAt = Date.now() + 60000;

      TokenBlacklist.add(token1, expiresAt);
      TokenBlacklist.add(token2, expiresAt);

      expect(TokenBlacklist.isBlacklisted(token1)).toBe(true);
      expect(TokenBlacklist.isBlacklisted(token2)).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove token from blacklist', () => {
      const token = 'test-token';
      const expiresAt = Date.now() + 60000;

      TokenBlacklist.add(token, expiresAt);
      expect(TokenBlacklist.isBlacklisted(token)).toBe(true);

      TokenBlacklist.remove(token);
      expect(TokenBlacklist.isBlacklisted(token)).toBe(false);
    });
  });

  describe('count', () => {
    it('should return count of blacklisted tokens', () => {
      expect(TokenBlacklist.count()).toBe(0);

      const expiresAt = Date.now() + 60000;
      TokenBlacklist.add('token-1', expiresAt);
      TokenBlacklist.add('token-2', expiresAt);

      expect(TokenBlacklist.count()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all blacklisted tokens', () => {
      const expiresAt = Date.now() + 60000;
      TokenBlacklist.add('token-1', expiresAt);
      TokenBlacklist.add('token-2', expiresAt);

      expect(TokenBlacklist.count()).toBe(2);

      TokenBlacklist.clear();

      expect(TokenBlacklist.count()).toBe(0);
    });
  });
});
