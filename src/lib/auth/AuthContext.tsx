'use client';

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
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
   * Initialize auth state on mount
   */
  useEffect(() => {
    const initAuth = async () => {
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
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []); // Empty deps - only run once on mount

  /**
   * Refresh user data from API
   */
  const refreshUser = useCallback(async () => {
    try {
      const storedToken = tokenManager.getToken();

      if (!storedToken) {
        setUser(null);
        setToken(null);
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
    }
  }, []);

  /**
   * Login user
   */
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setToken(response.token);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (data: RegisterRequest) => {
    try {
      const response = await authService.register(data);
      setUser(response.user);
      setToken(response.token);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
