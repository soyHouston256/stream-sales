'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PaginatedCommissions,
  CommissionFilters,
  CommissionBalance,
  PaymentRequest,
} from '@/types/affiliate';

async function fetchCommissions(filters: CommissionFilters): Promise<PaginatedCommissions> {
  const token = tokenManager.getToken();

  // Build query string from filters
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.referralId) params.append('referralId', filters.referralId);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  params.append('page', String(filters.page || 1));
  params.append('limit', String(filters.limit || 10));

  const response = await fetch(`/api/affiliate/commissions?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch commissions');
  }

  return response.json();
}

async function fetchCommissionBalance(): Promise<CommissionBalance> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/affiliate/commissions/balance', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch commission balance');
  }

  return response.json();
}

async function requestPayment(data: PaymentRequest): Promise<void> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/affiliate/commissions/request-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to request payment');
  }

  return response.json();
}

export function useAffiliateCommissions(filters: CommissionFilters) {
  return useQuery({
    queryKey: ['affiliate', 'commissions', filters],
    queryFn: () => fetchCommissions(filters),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });
}

export function useCommissionBalance() {
  return useQuery({
    queryKey: ['affiliate', 'commissions', 'balance'],
    queryFn: fetchCommissionBalance,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useRequestPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestPayment,
    onSuccess: () => {
      // Invalidate balance and commissions queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['affiliate', 'commissions', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate', 'commissions'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate', 'stats'] });
    },
  });
}
