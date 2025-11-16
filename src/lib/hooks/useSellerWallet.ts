'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  WalletBalance,
  WalletTransaction,
  Recharge,
  RechargeRequest,
  TransactionsFilters,
  PaginatedResponse,
} from '@/types/seller';
import { useToast } from './useToast';

async function fetchWalletBalance(): Promise<WalletBalance> {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/seller/wallet/balance', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch wallet balance');
  }

  return response.json();
}

async function fetchWalletTransactions(
  filters: TransactionsFilters
): Promise<PaginatedResponse<WalletTransaction>> {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.type) params.append('type', filters.type);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const response = await fetch(
    `/api/seller/wallet/transactions?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch transactions');
  }

  return response.json();
}

async function fetchRecharges(): Promise<Recharge[]> {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/seller/wallet/recharges', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch recharges');
  }

  return response.json();
}

async function createRecharge(data: RechargeRequest): Promise<Recharge> {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/seller/wallet/recharge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to request recharge');
  }

  return response.json();
}

export function useWalletBalance() {
  return useQuery({
    queryKey: ['seller', 'wallet', 'balance'],
    queryFn: fetchWalletBalance,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useWalletTransactions(filters: TransactionsFilters = {}) {
  return useQuery({
    queryKey: ['seller', 'wallet', 'transactions', filters],
    queryFn: () => fetchWalletTransactions(filters),
  });
}

export function useRecharges() {
  return useQuery({
    queryKey: ['seller', 'wallet', 'recharges'],
    queryFn: fetchRecharges,
  });
}

export function useCreateRecharge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createRecharge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller', 'wallet'] });
      queryClient.invalidateQueries({ queryKey: ['seller', 'stats'] });
      toast({
        title: 'Recharge requested',
        description:
          'Your recharge request has been submitted. It will be processed shortly.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Recharge failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
