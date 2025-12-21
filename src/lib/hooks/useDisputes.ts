import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { tokenManager } from '@/lib/utils/tokenManager';
import { Dispute, DisputeFilters, DisputesResponse, ResolveDisputeRequest } from '@/types/conciliator';
import { toast } from 'sonner';

/**
 * Hook para obtener lista de disputas con filtros
 */
export function useDisputes(filters: DisputeFilters = {}) {
  const queryParams = new URLSearchParams();

  if (filters.status) queryParams.append('status', filters.status);
  if (filters.dateFrom) queryParams.append('startDate', filters.dateFrom);
  if (filters.dateTo) queryParams.append('endDate', filters.dateTo);
  if (filters.sellerId) queryParams.append('sellerId', filters.sellerId);
  if (filters.providerId) queryParams.append('providerId', filters.providerId);
  if (filters.conciliatorId) queryParams.append('conciliatorId', filters.conciliatorId);

  // API uses offset/limit instead of page/limit
  const limit = filters.limit || 20;
  const page = filters.page || 1;
  const offset = (page - 1) * limit;

  queryParams.append('limit', limit.toString());
  queryParams.append('offset', offset.toString());

  return useQuery<DisputesResponse>({
    queryKey: ['conciliator', 'disputes', filters],
    queryFn: async () => {
      const response = await fetch(`/api/conciliator/disputes?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch disputes');
      }

      const data = await response.json();

      // Transform API response to match DisputesResponse
      return {
        disputes: data.disputes,
        pagination: {
          page,
          limit,
          total: data.total,
          totalPages: Math.ceil(data.total / limit),
        },
      };
    },
    staleTime: 1000 * 60 * 2, // Consider fresh for 2 minutes
  });
}

/**
 * Hook para obtener detalles completos de una disputa
 */
export function useDisputeDetails(id: string) {
  return useQuery<Dispute>({
    queryKey: ['conciliator', 'disputes', id],
    queryFn: async () => {
      const response = await fetch(`/api/conciliator/disputes/${id}`, {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dispute details');
      }

      const data = await response.json();
      // API returns { dispute, purchase, messages, messageCount }
      // We only need the dispute object
      return data.dispute;
    },
    enabled: !!id,
  });
}

/**
 * Hook para asignar una disputa a mí mismo
 */
export function useAssignDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (disputeId: string) => {
      const response = await fetch(`/api/conciliator/disputes/${disputeId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign dispute');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['conciliator', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['conciliator', 'stats'] });
      toast.success('Dispute assigned to you successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign dispute');
    },
  });
}

/**
 * Hook para resolver una disputa
 */
export function useResolveDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeId, data }: { disputeId: string; data: ResolveDisputeRequest }) => {
      const response = await fetch(`/api/conciliator/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resolve dispute');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['conciliator', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['conciliator', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['conciliator', 'performance'] });
      queryClient.invalidateQueries({ queryKey: ['conciliator', 'history'] });
      toast.success('Dispute resolved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resolve dispute');
    },
  });
}

/**
 * Hook para re-asignar una disputa a otro conciliator (solo admin)
 */
export function useReassignDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeId, conciliatorId }: { disputeId: string; conciliatorId: string }) => {
      const response = await fetch(`/api/conciliator/disputes/${disputeId}/reassign`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conciliatorId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reassign dispute');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conciliator', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['conciliator', 'stats'] });
      toast.success('Dispute reassigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reassign dispute');
    },
  });
}
