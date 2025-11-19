import { RateLimiter } from '../RateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    // Clear rate limiter state before each test
    RateLimiter.reset('test-identifier');
  });

  describe('isRateLimited', () => {
    it('should allow requests under the limit', () => {
      const result1 = RateLimiter.isRateLimited('test-user', 5, 60000);
      expect(result1.limited).toBe(false);

      const result2 = RateLimiter.isRateLimited('test-user', 5, 60000);
      expect(result2.limited).toBe(false);

      const result3 = RateLimiter.isRateLimited('test-user', 5, 60000);
      expect(result3.limited).toBe(false);
    });

    it('should block requests over the limit', () => {
      // Make 5 requests (limit)
      for (let i = 0; i < 5; i++) {
        RateLimiter.isRateLimited('test-user-2', 5, 60000);
      }

      // 6th request should be blocked
      const result = RateLimiter.isRateLimited('test-user-2', 5, 60000);
      expect(result.limited).toBe(true);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track different identifiers separately', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.isRateLimited('user-a', 5, 60000);
      }

      const resultA = RateLimiter.isRateLimited('user-a', 5, 60000);
      expect(resultA.limited).toBe(true);

      const resultB = RateLimiter.isRateLimited('user-b', 5, 60000);
      expect(resultB.limited).toBe(false);
    });

    it('should reset after successful auth', () => {
      for (let i = 0; i < 3; i++) {
        RateLimiter.isRateLimited('test-user-3', 5, 60000);
      }

      RateLimiter.reset('test-user-3');

      const result = RateLimiter.isRateLimited('test-user-3', 5, 60000);
      expect(result.limited).toBe(false);
      expect(RateLimiter.getAttemptCount('test-user-3')).toBe(1);
    });

    it('should return correct retry-after value', () => {
      for (let i = 0; i < 5; i++) {
        RateLimiter.isRateLimited('test-user-4', 5, 60000, 120000);
      }

      const result = RateLimiter.isRateLimited('test-user-4', 5, 60000, 120000);
      expect(result.limited).toBe(true);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(120);
    });
  });

  describe('getAttemptCount', () => {
    it('should return current attempt count', () => {
      RateLimiter.isRateLimited('test-user-5', 10, 60000);
      expect(RateLimiter.getAttemptCount('test-user-5')).toBe(1);

      RateLimiter.isRateLimited('test-user-5', 10, 60000);
      expect(RateLimiter.getAttemptCount('test-user-5')).toBe(2);
    });

    it('should return 0 for unknown identifier', () => {
      expect(RateLimiter.getAttemptCount('unknown-user')).toBe(0);
    });
  });

  describe('block', () => {
    it('should manually block an identifier', () => {
      RateLimiter.block('blocked-user', 60000);

      const result = RateLimiter.isRateLimited('blocked-user', 10, 60000);
      expect(result.limited).toBe(true);
    });
  });
});
