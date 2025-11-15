'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from './authService';
import { tokenManager } from '@/lib/utils/tokenManager';
import type {
  AuthContextType,
  User,
  LoginRequest,
  RegisterRequest,
} from '@/types/auth';
import { ApiError } from '@/lib/api/client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Refresh user data from API
   */
  const refreshUser = useCallback(async () => {
    try {
      const storedToken = tokenManager.getToken();

      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      const { user: currentUser } = await authService.getCurrentUser();
      setUser(currentUser);
      setToken(storedToken);
    } catch (error) {
      // Token is invalid or expired
      if (error instanceof ApiError && error.status === 401) {
        tokenManager.removeToken();
        setUser(null);
        setToken(null);
      }
      console.error('Failed to refresh user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  /**
   * Login user
   */
  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setToken(response.token);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  /**
   * Register new user
   */
  const register = async (data: RegisterRequest) => {
    try {
      const response = await authService.register(data);
      setUser(response.user);
      setToken(response.token);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
