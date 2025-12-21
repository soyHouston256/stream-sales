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

type UserType = 'seller' | 'affiliate';

async function fetchPurchases(
  filters: PurchasesFilters,
  userType: UserType = 'seller'
): Promise<PaginatedResponse<Purchase>> {
  const token = tokenManager.getToken();
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.category) params.append('category', filters.category);
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const endpoint = userType === 'affiliate' ? '/api/affiliate/purchases' : '/api/seller/purchases';
  const response = await fetch(`${endpoint}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch purchases');
  }

  return response.json();
}

async function fetchPurchaseDetails(id: string, userType: UserType = 'seller'): Promise<Purchase> {
  const token = tokenManager.getToken();
  const endpoint = userType === 'affiliate' ? '/api/affiliate/purchases' : '/api/seller/purchases';
  const response = await fetch(`${endpoint}/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch purchase details');
  }

  return response.json();
}

async function createPurchase(data: PurchaseRequest, userType: UserType = 'seller'): Promise<Purchase> {
  const token = tokenManager.getToken();
  const endpoint = userType === 'affiliate' ? '/api/affiliate/purchases' : '/api/seller/purchases';
  const response = await fetch(endpoint, {
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

export function usePurchases(filters: PurchasesFilters = {}, userType: UserType = 'seller') {
  return useQuery({
    queryKey: [userType, 'purchases', filters],
    queryFn: () => fetchPurchases(filters, userType),
  });
}

export function usePurchaseDetails(id: string, userType: UserType = 'seller') {
  return useQuery({
    queryKey: [userType, 'purchases', id],
    queryFn: () => fetchPurchaseDetails(id, userType),
    enabled: !!id,
  });
}

export function useCreatePurchase(userType: UserType = 'seller') {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: PurchaseRequest) => createPurchase(data, userType),
    onSuccess: (purchase) => {
      queryClient.invalidateQueries({ queryKey: [userType, 'purchases'] });
      queryClient.invalidateQueries({ queryKey: [userType, 'stats'] });
      queryClient.invalidateQueries({ queryKey: [userType, 'wallet'] });
      queryClient.invalidateQueries({ queryKey: [userType, 'marketplace'] });
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

