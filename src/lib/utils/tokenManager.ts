const TOKEN_KEY = 'auth_token';

/**
 * Validates if a string is a properly formatted JWT token
 */
function isValidJWTFormat(token: string): boolean {
  if (!token) return false;

  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  // Each part should be base64 encoded (not empty)
  return parts.every(part => part.length > 0);
}

export const tokenManager = {
  /**
   * Saves JWT token to localStorage
   */
  setToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  /**
   * Retrieves JWT token from localStorage
   * Automatically clears invalid/malformed tokens
   */
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY);

      // Validate token format
      if (token && !isValidJWTFormat(token)) {
        console.warn('Malformed token detected, clearing localStorage');
        tokenManager.removeToken();
        // Also clear old 'token' key if it exists
        localStorage.removeItem('token');
        return null;
      }

      return token;
    }
    return null;
  },

  /**
   * Removes JWT token from localStorage
   */
  removeToken: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      // Also remove old 'token' key for cleanup
      localStorage.removeItem('token');
    }
  },

  /**
   * Checks if a valid token exists
   */
  hasToken: (): boolean => {
    return !!tokenManager.getToken();
  },

  /**
   * Clear all auth-related data and redirect to login
   */
  clearAndRedirect: (): void => {
    if (typeof window !== 'undefined') {
      tokenManager.removeToken();
      window.location.href = '/login';
    }
  },
};
