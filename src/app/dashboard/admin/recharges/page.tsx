'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, AlertCircle, Search, DollarSign } from 'lucide-react';
import { tokenManager } from '@/lib/utils/tokenManager';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Wallet {
  id: string;
  userId: string;
  balance: string;
  currency: string;
  status: string;
}

interface Recharge {
  id: string;
  walletId: string;
  wallet: Wallet;
  user: User;
  amount: string;
  paymentMethod: string;
  paymentGateway: string;
  externalTransactionId: string | null;
  status: string;
  metadata: any;
  createdAt: string;
  completedAt: string | null;
}

interface RechargesResponse {
  data: Recharge[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    pending: number;
    completed: number;
    failed: number;
    cancelled: number;
    totalPendingAmount: string;
    totalCompletedAmount: string;
  };
}

export default function AdminRechargesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRecharge, setSelectedRecharge] = useState<Recharge | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [externalTxId, setExternalTxId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch recharges
  const { data: rechargesData, isLoading, error } = useQuery<RechargesResponse>({
    queryKey: ['admin-recharges', statusFilter, searchTerm, page],
    queryFn: async () => {
      const token = tokenManager.getToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/recharges?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch recharges');
      return response.json();
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, externalTransactionId }: { id: string; externalTransactionId?: string }) => {
      const token = tokenManager.getToken();
      const response = await fetch(`/api/admin/recharges/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ externalTransactionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve recharge');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Recarga Aprobada',
        description: `Saldo actualizado: $${data.newWalletBalance}`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-recharges'] });
      setShowApproveDialog(false);
      setSelectedRecharge(null);
      setExternalTxId('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const token = tokenManager.getToken();
      const response = await fetch(`/api/admin/recharges/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, status: 'cancelled' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject recharge');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Recarga Rechazada',
        description: 'La solicitud de recarga ha sido rechazada',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-recharges'] });
      setShowRejectDialog(false);
      setSelectedRecharge(null);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleApprove = (recharge: Recharge) => {
    setSelectedRecharge(recharge);
    setShowApproveDialog(true);
  };

  const handleReject = (recharge: Recharge) => {
    setSelectedRecharge(recharge);
    setShowRejectDialog(true);
  };

  const confirmApprove = () => {
    if (!selectedRecharge) return;
    approveMutation.mutate({
      id: selectedRecharge.id,
      externalTransactionId: externalTxId || undefined,
    });
  };

  const confirmReject = () => {
    if (!selectedRecharge || !rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'La razón de rechazo es requerida (mínimo 10 caracteres)',
        variant: 'destructive',
      });
      return;
    }

    if (rejectionReason.length < 10) {
      toast({
        title: 'Error',
        description: 'La razón de rechazo debe tener al menos 10 caracteres',
        variant: 'destructive',
      });
      return;
    }

    rejectMutation.mutate({
      id: selectedRecharge.id,
      reason: rejectionReason,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'default', label: 'Pendiente' },
      completed: { variant: 'default', label: 'Completado' },
      failed: { variant: 'destructive', label: 'Fallido' },
      cancelled: { variant: 'secondary', label: 'Cancelado' },
    };

    const config = variants[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      credit_card: 'Tarjeta de Crédito',
      paypal: 'PayPal',
      bank_transfer: 'Transferencia Bancaria',
      crypto: 'Criptomoneda',
      mock: 'Prueba',
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Recargas</h1>
        <p className="text-muted-foreground mt-2">
          Aprueba o rechaza solicitudes de recarga de saldo
        </p>
      </div>

      {/* Summary Cards */}
      {rechargesData?.summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rechargesData.summary.pending}</div>
              <p className="text-xs text-muted-foreground">
                ${rechargesData.summary.totalPendingAmount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rechargesData.summary.completed}</div>
              <p className="text-xs text-muted-foreground">
                ${rechargesData.summary.totalCompletedAmount}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fallidas</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rechargesData.summary.failed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
              <XCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rechargesData.summary.cancelled}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="status">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="failed">Fallidas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                  <SelectItem value="">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Usuario, email, wallet ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recharges Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recargas</CardTitle>
          <CardDescription>
            {rechargesData?.pagination.total || 0} solicitudes encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                Error al cargar las recargas. Por favor, intenta de nuevo.
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Detalles</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rechargesData?.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No se encontraron recargas
                      </TableCell>
                    </TableRow>
                  ) : (
                    rechargesData?.data.map((recharge) => (
                      <TableRow key={recharge.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{recharge.user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {recharge.user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                            <span className="font-semibold">${recharge.amount}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getPaymentMethodLabel(recharge.paymentMethod)}</TableCell>
                        <TableCell>{getStatusBadge(recharge.status)}</TableCell>
                        <TableCell>
                          {new Date(recharge.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          {recharge.metadata?.paymentDetails && (
                            <div className="text-sm text-muted-foreground max-w-xs truncate">
                              {recharge.metadata.paymentDetails}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {recharge.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(recharge)}
                                variant="default"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleReject(recharge)}
                                variant="destructive"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rechazar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {rechargesData && rechargesData.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="flex items-center px-4">
                    Página {page} de {rechargesData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= rechargesData.pagination.totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Recarga</DialogTitle>
            <DialogDescription>
              ¿Confirmar la aprobación de esta recarga?
            </DialogDescription>
          </DialogHeader>
          {selectedRecharge && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Usuario:</p>
                <p className="text-sm text-muted-foreground">{selectedRecharge.user.name} ({selectedRecharge.user.email})</p>
              </div>
              <div>
                <p className="text-sm font-medium">Monto:</p>
                <p className="text-2xl font-bold">${selectedRecharge.amount}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Método de Pago:</p>
                <p className="text-sm text-muted-foreground">{getPaymentMethodLabel(selectedRecharge.paymentMethod)}</p>
              </div>
              {selectedRecharge.metadata?.paymentDetails && (
                <div>
                  <p className="text-sm font-medium">Detalles del Pago:</p>
                  <p className="text-sm text-muted-foreground">{selectedRecharge.metadata.paymentDetails}</p>
                </div>
              )}
              <div>
                <Label htmlFor="externalTxId">ID Transacción Externa (Opcional)</Label>
                <Input
                  id="externalTxId"
                  placeholder="ej: BANCO_REF_123456"
                  value={externalTxId}
                  onChange={(e) => setExternalTxId(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Aprobando...' : 'Confirmar Aprobación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Recarga</DialogTitle>
            <DialogDescription>
              Proporciona una razón para el rechazo
            </DialogDescription>
          </DialogHeader>
          {selectedRecharge && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Usuario:</p>
                <p className="text-sm text-muted-foreground">{selectedRecharge.user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Monto:</p>
                <p className="text-lg font-bold">${selectedRecharge.amount}</p>
              </div>
              <div>
                <Label htmlFor="rejectionReason">Razón del Rechazo *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Explica por qué se rechaza esta recarga (mínimo 10 caracteres)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending || rejectionReason.length < 10}
            >
              {rejectMutation.isPending ? 'Rechazando...' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
