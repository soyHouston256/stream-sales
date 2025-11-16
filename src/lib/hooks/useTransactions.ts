'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useQuery } from '@tanstack/react-query';
import { Transaction, PaginatedResponse } from '@/types/admin';

interface TransactionsFilters {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}

async function fetchTransactions(
  filters: TransactionsFilters
): Promise<PaginatedResponse<Transaction>> {
  const token = tokenManager.getToken();
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.type) params.append('type', filters.type);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const response = await fetch(`/api/admin/transactions?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch transactions');
  }

  return response.json();
}

export function useTransactions(filters: TransactionsFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'transactions', filters],
    queryFn: () => fetchTransactions(filters),
  });
}

export function exportTransactionsToCSV(transactions: Transaction[]) {
  const headers = ['ID', 'Tipo', 'Monto', 'Origen', 'Destino', 'Fecha', 'Descripción'];

  const rows = transactions.map((tx) => [
    tx.id,
    tx.type,
    tx.amount.toString(),
    tx.sourceUser?.email || tx.sourceWalletId,
    tx.destinationUser?.email || tx.destinationWalletId || 'N/A',
    new Date(tx.createdAt).toLocaleString('es-ES'),
    tx.description || 'N/A',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `transacciones_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
