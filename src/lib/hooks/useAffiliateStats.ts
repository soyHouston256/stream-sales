'use client';

import { useQuery } from '@tanstack/react-query';
import { AffiliateStats, ReferralsByMonth } from '@/types/affiliate';

async function fetchAffiliateStats(): Promise<AffiliateStats> {
  const token = localStorage.getItem('token');
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
  const token = localStorage.getItem('token');
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
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useReferralsByMonth(months: number = 6) {
  return useQuery({
    queryKey: ['affiliate', 'referrals', 'by-month', months],
    queryFn: () => fetchReferralsByMonth(months),
    refetchInterval: 60000, // Refetch every minute
  });
}
