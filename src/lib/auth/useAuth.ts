'use client';

import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import type { AuthContextType } from '@/types/auth';

/**
 * Custom hook to access authentication context
 *
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
