'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useQuery } from '@tanstack/react-query';
import { AffiliateStats, ReferralsByMonth } from '@/types/affiliate';

async function fetchAffiliateStats(): Promise<AffiliateStats> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/affiliate/stats', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch affiliate stats');
  }

  return response.json();
}

async function fetchReferralsByMonth(months: number): Promise<ReferralsByMonth[]> {
  const token = tokenManager.getToken();
  const response = await fetch(`/api/affiliate/stats/referrals-by-month?months=${months}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch referrals by month');
  }

  return response.json();
}

export function useAffiliateStats() {
  return useQuery({
    queryKey: ['affiliate', 'stats'],
    queryFn: fetchAffiliateStats,
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
  });
}

export function useReferralsByMonth(months: number = 6) {
  return useQuery({
    queryKey: ['affiliate', 'referrals', 'by-month', months],
    queryFn: () => fetchReferralsByMonth(months),
    staleTime: 1000 * 60 * 10, // Consider fresh for 10 minutes
  });
}
