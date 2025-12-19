'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { tokenManager } from '@/lib/utils/tokenManager';

/**
 * Wallet balance data structure
 */
export interface WalletBalanceData {
  balance: number;
  pendingAmount: number;
  currency: string;
  lastUpdated: string; // ISO date string
}

/**
 * Role-specific wallet balance endpoints
 */
const WALLET_ENDPOINTS = {
  seller: '/api/seller/wallet/balance',
  provider: '/api/provider/earnings/balance',
  affiliate: '/api/affiliate/balance',
} as const;

/**
 * Fetch wallet balance from API
 */
async function fetchWalletBalance(
  role: keyof typeof WALLET_ENDPOINTS
): Promise<WalletBalanceData> {
  const token = tokenManager.getToken();
  // eslint-disable-next-line security/detect-object-injection
  const endpoint = WALLET_ENDPOINTS[role];

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch wallet balance' }));
    throw new Error(error.message || 'Failed to fetch wallet balance');
  }

  const data = await response.json();

  // Normalize response structure across different roles
  return {
    balance: data.balance ?? data.walletBalance ?? data.availableBalance ?? 0,
    pendingAmount: data.pendingAmount ?? data.pendingBalance ?? 0,
    currency: data.currency ?? 'USD',
    lastUpdated: data.lastUpdated ?? data.updatedAt ?? new Date().toISOString(),
  };
}

/**
 * Hook options
 */
export interface UseWalletBalanceOptions {
  role: 'seller' | 'provider' | 'affiliate';
  pollingInterval?: number; // in milliseconds, default 30000 (30s)
  enabled?: boolean;
}

/**
 * Custom hook to fetch and manage wallet balance with smart polling
 *
 * Features:
 * - Real-time balance updates via polling
 * - Error handling with retry logic
 * - Loading states
 * - Optimistic updates support
 * - Cache invalidation
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useWalletBalance({
 *   role: 'seller',
 *   pollingInterval: 30000
 * });
 * ```
 */
export function useWalletBalance({
  role,
  pollingInterval = 30000,
  enabled = true,
}: UseWalletBalanceOptions): UseQueryResult<WalletBalanceData, Error> {
  return useQuery<WalletBalanceData, Error>({
    queryKey: ['wallet', 'balance', role],
    queryFn: () => fetchWalletBalance(role),

    // Enable real-time updates with smart polling
    refetchInterval: enabled ? pollingInterval : false,

    // Refetch on window focus to ensure data freshness
    refetchOnWindowFocus: true,

    // Refetch on reconnect after network issues
    refetchOnReconnect: true,

    // Keep previous data while fetching new data (prevents flickering)
    placeholderData: (previousData) => previousData,

    // Cache data for 5 minutes
    gcTime: 5 * 60 * 1000,

    // Consider data stale after 30 seconds
    staleTime: 30 * 1000,

    // Retry failed requests with exponential backoff
    retry: (failureCount, error) => {
      // Don't retry on auth errors (401, 403)
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },

    // Exponential backoff delay
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Enable query only if role is provided and enabled flag is true
    enabled: enabled && !!role,
  });
}

/**
 * Hook variant for seller wallet balance
 */
export function useSellerWalletBalance(options: Omit<UseWalletBalanceOptions, 'role'> = {}) {
  return useWalletBalance({ ...options, role: 'seller' });
}

/**
 * Hook variant for provider wallet balance
 */
export function useProviderWalletBalance(options: Omit<UseWalletBalanceOptions, 'role'> = {}) {
  return useWalletBalance({ ...options, role: 'provider' });
}

/**
 * Hook variant for affiliate wallet balance
 */
export function useAffiliateWalletBalance(options: Omit<UseWalletBalanceOptions, 'role'> = {}) {
  return useWalletBalance({ ...options, role: 'affiliate' });
}
