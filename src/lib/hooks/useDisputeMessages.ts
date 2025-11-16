import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DisputeMessage, MessagesResponse, AddMessageRequest } from '@/types/conciliator';
import { toast } from 'sonner';

/**
 * Hook para obtener mensajes de una disputa
 */
export function useDisputeMessages(disputeId: string) {
  return useQuery<MessagesResponse>({
    queryKey: ['conciliator', 'disputes', disputeId, 'messages'],
    queryFn: async () => {
      const response = await fetch(`/api/conciliator/disputes/${disputeId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dispute messages');
      }

      return response.json();
    },
    enabled: !!disputeId,
    refetchInterval: 10000, // Refetch cada 10 segundos para mensajes en tiempo real
  });
}

/**
 * Hook para agregar un mensaje a una disputa
 */
export function useAddMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeId, data }: { disputeId: string; data: AddMessageRequest }) => {
      const response = await fetch(`/api/conciliator/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidar mensajes de esta disputa
      queryClient.invalidateQueries({ queryKey: ['conciliator', 'disputes', variables.disputeId, 'messages'] });
      toast.success(variables.data.isInternal ? 'Internal note added' : 'Message sent');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
}

/**
 * Hook para agregar una nota interna
 */
export function useAddInternalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeId, message }: { disputeId: string; message: string }) => {
      const response = await fetch(`/api/conciliator/disputes/${disputeId}/internal-notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add internal note');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conciliator', 'disputes', variables.disputeId, 'messages'] });
      toast.success('Internal note added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add internal note');
    },
  });
}
