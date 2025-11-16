'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Purchase,
  PurchaseRequest,
  PurchasesFilters,
  PaginatedResponse,
} from '@/types/seller';
import { useToast } from './useToast';
import { tokenManager } from '@/lib/utils/tokenManager';

async function fetchPurchases(
  filters: PurchasesFilters
): Promise<PaginatedResponse<Purchase>> {
  const token = tokenManager.getToken();
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.category) params.append('category', filters.category);
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const response = await fetch(`/api/seller/purchases?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch purchases');
  }

  return response.json();
}

async function fetchPurchaseDetails(id: string): Promise<Purchase> {
  const token = tokenManager.getToken();
  const response = await fetch(`/api/seller/purchases/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch purchase details');
  }

  return response.json();
}

async function createPurchase(data: PurchaseRequest): Promise<Purchase> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/seller/purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to complete purchase');
  }

  return response.json();
}

export function usePurchases(filters: PurchasesFilters = {}) {
  return useQuery({
    queryKey: ['seller', 'purchases', filters],
    queryFn: () => fetchPurchases(filters),
  });
}

export function usePurchaseDetails(id: string) {
  return useQuery({
    queryKey: ['seller', 'purchases', id],
    queryFn: () => fetchPurchaseDetails(id),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createPurchase,
    onSuccess: (purchase) => {
      queryClient.invalidateQueries({ queryKey: ['seller', 'purchases'] });
      queryClient.invalidateQueries({ queryKey: ['seller', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['seller', 'wallet'] });
      queryClient.invalidateQueries({ queryKey: ['seller', 'marketplace'] });
      toast({
        title: 'Purchase successful!',
        description: `You purchased ${purchase.product.name}. Check your purchase details for credentials.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Purchase failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
