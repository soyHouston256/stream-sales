import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dispute, DisputeFilters, DisputesResponse, ResolveDisputeRequest } from '@/types/conciliator';
import { toast } from 'sonner';

/**
 * Hook para obtener lista de disputas con filtros
 */
export function useDisputes(filters: DisputeFilters = {}) {
  const queryParams = new URLSearchParams();

  if (filters.status) queryParams.append('status', filters.status);
  if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
  if (filters.sellerId) queryParams.append('sellerId', filters.sellerId);
  if (filters.providerId) queryParams.append('providerId', filters.providerId);
  if (filters.conciliatorId) queryParams.append('conciliatorId', filters.conciliatorId);
  if (filters.page) queryParams.append('page', filters.page.toString());
  if (filters.limit) queryParams.append('limit', filters.limit.toString());

  return useQuery<DisputesResponse>({
    queryKey: ['conciliator', 'disputes', filters],
    queryFn: async () => {
      const response = await fetch(`/api/conciliator/disputes?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch disputes');
      }

      return response.json();
    },
    refetchInterval: 30000, // Refetch cada 30 segundos para actualizaciones
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dispute details');
      }

      return response.json();
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
