import { tokenManager } from '../tokenManager';

describe('tokenManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('setToken', () => {
    it('should store token in localStorage', () => {
      const token = 'test-token-123';
      tokenManager.setToken(token);

      expect(localStorage.getItem('auth_token')).toBe(token);
    });
  });

  describe('getToken', () => {
    it('should retrieve token from localStorage', () => {
      const token = 'test-token-456';
      localStorage.setItem('auth_token', token);

      const result = tokenManager.getToken();

      expect(result).toBe(token);
    });

    it('should return null if no token exists', () => {
      const result = tokenManager.getToken();

      expect(result).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('should remove token from localStorage', () => {
      localStorage.setItem('auth_token', 'test-token');

      tokenManager.removeToken();

      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('hasToken', () => {
    it('should return true if token exists', () => {
      localStorage.setItem('auth_token', 'test-token');

      const result = tokenManager.hasToken();

      expect(result).toBe(true);
    });

    it('should return false if token does not exist', () => {
      const result = tokenManager.hasToken();

      expect(result).toBe(false);
    });
  });
});
