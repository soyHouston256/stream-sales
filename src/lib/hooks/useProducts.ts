'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilters,
  PaginatedResponse,
} from '@/types/provider';
import { useToast } from './useToast';

async function fetchProducts(
  filters: ProductFilters
): Promise<PaginatedResponse<Product>> {
  const token = tokenManager.getToken();
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.category) params.append('category', filters.category);
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);

  const response = await fetch(`/api/provider/products?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }

  return response.json();
}

async function fetchProductById(id: string): Promise<Product> {
  const token = tokenManager.getToken();
  const response = await fetch(`/api/provider/products/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch product');
  }

  return response.json();
}

async function createProduct(data: CreateProductDTO): Promise<Product> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/provider/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create product');
  }

  return response.json();
}

async function updateProduct(
  id: string,
  data: UpdateProductDTO
): Promise<Product> {
  const token = tokenManager.getToken();
  const response = await fetch(`/api/provider/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update product');
  }

  return response.json();
}

async function deleteProduct(id: string): Promise<void> {
  const token = tokenManager.getToken();
  const response = await fetch(`/api/provider/products/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete product');
  }
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ['provider', 'products', filters],
    queryFn: () => fetchProducts(filters),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['provider', 'products', id],
    queryFn: () => fetchProductById(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['provider', 'stats'] });
      toast({
        title: 'Product created',
        description: 'Your product has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDTO }) =>
      updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['provider', 'products'] });
      queryClient.invalidateQueries({
        queryKey: ['provider', 'products', variables.id],
      });
      toast({
        title: 'Product updated',
        description: 'Your product has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['provider', 'stats'] });
      toast({
        title: 'Product deleted',
        description: 'Your product has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
