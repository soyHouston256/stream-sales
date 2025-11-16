'use client';

import { useState } from 'react';
import { useTransactions, exportTransactionsToCSV } from '@/lib/hooks/useTransactions';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Transaction } from '@/types/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const typeLabels: Record<string, string> = {
  credit: 'Crédito',
  debit: 'Débito',
  transfer: 'Transferencia',
};

const typeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'success'> = {
  credit: 'success',
  debit: 'destructive',
  transfer: 'default',
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isLoading } = useTransactions({
    page,
    limit: 10,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  const handleExport = () => {
    if (data?.data) {
      exportTransactionsToCSV(data.data);
    }
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (tx) => (
        <div className="font-mono text-xs">{tx.id.slice(0, 8)}...</div>
      ),
      className: 'w-[100px]',
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (tx) => (
        <Badge variant={typeColors[tx.type] || 'default'}>
          {typeLabels[tx.type] || tx.type}
        </Badge>
      ),
      className: 'w-[120px]',
    },
    {
      key: 'amount',
      label: 'Monto',
      render: (tx) => (
        <div className="font-semibold">
          ${tx.amount.toFixed(2)}
        </div>
      ),
      className: 'w-[120px]',
    },
    {
      key: 'source',
      label: 'Origen → Destino',
      render: (tx) => (
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <div className="font-medium">
              {tx.sourceUser?.email || tx.sourceWalletId.slice(0, 8)}
            </div>
            {tx.sourceUser?.name && (
              <div className="text-muted-foreground text-xs">
                {tx.sourceUser.name}
              </div>
            )}
          </div>
          {tx.destinationWalletId && (
            <>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium">
                  {tx.destinationUser?.email ||
                    tx.destinationWalletId.slice(0, 8)}
                </div>
                {tx.destinationUser?.name && (
                  <div className="text-muted-foreground text-xs">
                    {tx.destinationUser.name}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Descripción',
      render: (tx) => (
        <div className="text-sm text-muted-foreground">
          {tx.description || 'Sin descripción'}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      render: (tx) => (
        <div className="text-sm">
          <div>{format(new Date(tx.createdAt), 'dd MMM yyyy', { locale: es })}</div>
          <div className="text-muted-foreground text-xs">
            {format(new Date(tx.createdAt), 'HH:mm:ss', { locale: es })}
          </div>
        </div>
      ),
      className: 'w-[140px]',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoreo de Transacciones</h1>
          <p className="text-muted-foreground mt-2">
            Visualiza y exporta todas las transacciones del sistema
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={!data?.data || data.data.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtra las transacciones por tipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Select value={typeFilter} onValueChange={handleTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="debit">Débito</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones</CardTitle>
          <CardDescription>
            Lista de todas las transacciones del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data?.data || []}
            columns={columns}
            isLoading={isLoading}
            pagination={
              data
                ? {
                    currentPage: data.pagination.page,
                    totalPages: data.pagination.totalPages,
                    onPageChange: setPage,
                  }
                : undefined
            }
            emptyMessage="No se encontraron transacciones"
          />
        </CardContent>
      </Card>
    </div>
  );
}
