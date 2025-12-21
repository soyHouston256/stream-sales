'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  WalletBalance,
  WalletTransaction,
  Recharge,
  RechargeRequest,
  TransactionsFilters,
  PaginatedResponse,
} from '@/types/seller'; // Reutilizamos los tipos existentes
import { useToast } from './useToast';
import { tokenManager } from '@/lib/utils/tokenManager';

/**
 * Fetch affiliate wallet balance
 */
async function fetchAffiliateWalletBalance(): Promise<WalletBalance> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/affiliate/wallet/balance', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch affiliate wallet balance');
  }

  return response.json();
}

/**
 * Fetch affiliate wallet transactions
 */
async function fetchAffiliateWalletTransactions(
  filters: TransactionsFilters
): Promise<PaginatedResponse<WalletTransaction>> {
  const token = tokenManager.getToken();
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.type) params.append('type', filters.type);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const response = await fetch(
    `/api/affiliate/wallet/transactions?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch affiliate transactions');
  }

  return response.json();
}

/**
 * Fetch affiliate recharges
 */
async function fetchAffiliateRecharges(): Promise<Recharge[]> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/affiliate/wallet/recharges', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch affiliate recharges');
  }

  return response.json();
}

/**
 * Create affiliate recharge request
 */
async function createAffiliateRecharge(data: RechargeRequest): Promise<Recharge> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/affiliate/wallet/recharge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to request affiliate recharge');
  }

  return response.json();
}

/**
 * Hook to get affiliate wallet balance
 */
export function useAffiliateWalletBalance() {
  return useQuery({
    queryKey: ['affiliate', 'wallet', 'balance'],
    queryFn: fetchAffiliateWalletBalance,
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
  });
}

/**
 * Hook to get affiliate wallet transactions with filters
 */
export function useAffiliateWalletTransactions(filters: TransactionsFilters = {}) {
  return useQuery({
    queryKey: ['affiliate', 'wallet', 'transactions', filters],
    queryFn: () => fetchAffiliateWalletTransactions(filters),
  });
}

/**
 * Hook to get affiliate recharges history
 */
export function useAffiliateRecharges() {
  return useQuery({
    queryKey: ['affiliate', 'wallet', 'recharges'],
    queryFn: fetchAffiliateRecharges,
  });
}

/**
 * Hook to create affiliate recharge request
 */
export function useCreateAffiliateRecharge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createAffiliateRecharge,
    onSuccess: () => {
      // Invalidate all affiliate wallet related queries
      queryClient.invalidateQueries({ queryKey: ['affiliate', 'wallet'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate', 'stats'] });
      toast({
        title: 'Recarga solicitada',
        description:
          'Tu solicitud de recarga ha sido enviada. Será procesada en breve.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al solicitar recarga',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
