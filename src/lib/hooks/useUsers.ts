'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, PaginatedResponse } from '@/types/admin';

interface UsersFilters {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  status?: string;
}

async function fetchUsers(filters: UsersFilters): Promise<PaginatedResponse<User>> {
  const token = tokenManager.getToken();
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.role) params.append('role', filters.role);
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);

  const response = await fetch(`/api/admin/users?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
}

async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  const token = tokenManager.getToken();
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update user');
  }

  return response.json();
}

export function useUsers(filters: UsersFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => fetchUsers(filters),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<User> }) =>
      updateUser(userId, data),
    onSuccess: () => {
      // Invalidate all user queries to refetch
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
