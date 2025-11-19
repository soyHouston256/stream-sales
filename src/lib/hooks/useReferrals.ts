'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useQuery } from '@tanstack/react-query';
import { PaginatedReferrals, ReferralFilters, ReferralDetails } from '@/types/affiliate';

async function fetchReferrals(filters: ReferralFilters): Promise<PaginatedReferrals> {
  const token = tokenManager.getToken();

  // Build query string from filters
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.role) params.append('role', filters.role);
  if (filters.search) params.append('search', filters.search);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  params.append('page', String(filters.page || 1));
  params.append('limit', String(filters.limit || 10));

  const response = await fetch(`/api/affiliate/referrals?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch referrals');
  }

  return response.json();
}

async function fetchReferralDetails(id: string): Promise<ReferralDetails> {
  const token = tokenManager.getToken();
  const response = await fetch(`/api/affiliate/referrals/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch referral details');
  }

  return response.json();
}

export function useReferrals(filters: ReferralFilters) {
  return useQuery({
    queryKey: ['affiliate', 'referrals', filters],
    queryFn: () => fetchReferrals(filters),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });
}

export function useReferralDetails(id: string) {
  return useQuery({
    queryKey: ['affiliate', 'referrals', id],
    queryFn: () => fetchReferralDetails(id),
    enabled: !!id, // Only fetch if id is provided
  });
}
