'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CommissionConfig, CommissionHistory } from '@/types/admin';

async function fetchCommissionConfig(): Promise<CommissionConfig> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/admin/commissions', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch commission config');
  }

  return response.json();
}

async function updateCommissionConfig(
  config: Partial<CommissionConfig>
): Promise<CommissionConfig> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/admin/commissions', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error('Failed to update commission config');
  }

  return response.json();
}

async function fetchCommissionHistory(): Promise<CommissionHistory[]> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/admin/commissions/history', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch commission history');
  }

  return response.json();
}

export function useCommissionConfig() {
  return useQuery({
    queryKey: ['admin', 'commissions', 'config'],
    queryFn: fetchCommissionConfig,
  });
}

export function useUpdateCommissionConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCommissionConfig,
    onSuccess: () => {
      // Invalidate all commission queries to refetch
      queryClient.invalidateQueries({ queryKey: ['admin', 'commissions'] });
    },
  });
}

export function useCommissionHistory() {
  return useQuery({
    queryKey: ['admin', 'commissions', 'history'],
    queryFn: fetchCommissionHistory,
  });
}
