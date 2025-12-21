'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  WalletBalance,
  Transaction,
  WithdrawalRequest,
  CreateWithdrawalDTO,
  TransactionsFilters,
  PaginatedResponse,
} from '@/types/provider';
import { useToast } from './useToast';

async function fetchProviderBalance(): Promise<WalletBalance> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/provider/earnings/balance', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch balance');
  }

  return response.json();
}

async function fetchEarningsTransactions(
  filters: TransactionsFilters
): Promise<PaginatedResponse<Transaction>> {
  const token = tokenManager.getToken();
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.type) params.append('type', filters.type);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const response = await fetch(
    `/api/provider/earnings/transactions?${params.toString()}`,
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

async function fetchWithdrawals(): Promise<WithdrawalRequest[]> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/provider/earnings/withdrawals', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch withdrawals');
  }

  return response.json();
}

async function createWithdrawal(
  data: CreateWithdrawalDTO
): Promise<WithdrawalRequest> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/provider/earnings/withdraw', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create withdrawal request');
  }

  return response.json();
}

export function useProviderBalance() {
  return useQuery({
    queryKey: ['provider', 'earnings', 'balance'],
    queryFn: fetchProviderBalance,
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
  });
}

export function useEarningsTransactions(filters: TransactionsFilters = {}) {
  return useQuery({
    queryKey: ['provider', 'earnings', 'transactions', filters],
    queryFn: () => fetchEarningsTransactions(filters),
  });
}

export function useWithdrawals() {
  return useQuery({
    queryKey: ['provider', 'earnings', 'withdrawals'],
    queryFn: fetchWithdrawals,
  });
}

export function useRequestWithdrawal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createWithdrawal,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['provider', 'earnings', 'balance'],
      });
      queryClient.invalidateQueries({
        queryKey: ['provider', 'earnings', 'withdrawals'],
      });
      queryClient.invalidateQueries({
        queryKey: ['provider', 'earnings', 'transactions'],
      });
      toast({
        title: 'Withdrawal requested',
        description:
          'Your withdrawal request has been submitted and is pending approval.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
