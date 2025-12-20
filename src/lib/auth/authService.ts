import { apiClient } from '@/lib/api/client';
import { tokenManager } from '@/lib/utils/tokenManager';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from '@/types/auth';

/**
 * Authentication service for API calls
 */
export const authService = {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse, LoginRequest>(
      '/api/auth/login',
      credentials
    );

    // Save token to localStorage
    tokenManager.setToken(response.token);

    return response;
  },

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse, RegisterRequest>(
      '/api/auth/register',
      data
    );

    // Save token to localStorage
    tokenManager.setToken(response.token);

    return response;
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<{ user: User }> {
    return apiClient.get<{ user: User }>('/api/auth/me', true);
  },

  /**
   * Logout user (client-side only)
   */
  logout(): void {
    tokenManager.removeToken();
  },
};
