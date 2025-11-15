const TOKEN_KEY = 'auth_token';

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
   */
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  /**
   * Removes JWT token from localStorage
   */
  removeToken: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  /**
   * Checks if a valid token exists
   */
  hasToken: (): boolean => {
    return !!tokenManager.getToken();
  },
};
