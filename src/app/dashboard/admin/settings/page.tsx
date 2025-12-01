'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tokenManager } from '@/lib/utils/tokenManager';

export default function AdminSettingsPage() {
  const [approvalFee, setApprovalFee] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current approval fee configuration
  const { data, isLoading, error } = useQuery({
    queryKey: ['referral-approval-fee'],
    queryFn: async () => {
      const token = tokenManager.getToken();
      const response = await fetch('/api/admin/settings/referral-fee', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { data: { approvalFee: '0.00' } };
        }
        throw new Error('Failed to fetch approval fee configuration');
      }

      return response.json();
    },
  });

  // Update approvalFee state when data changes
  useEffect(() => {
    if (data?.data?.approvalFee) {
      setApprovalFee(data.data.approvalFee);
    }
  }, [data]);

  // Update approval fee mutation
  const updateMutation = useMutation({
    mutationFn: async (newFee: string) => {
      const token = tokenManager.getToken();
      const response = await fetch('/api/admin/settings/referral-fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approvalFee: newFee }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update approval fee');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-approval-fee'] });
      toast({
        title: 'Configuración actualizada',
        description: 'El monto de aprobación de referidos ha sido actualizado exitosamente.',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la configuración.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate input
    const feeValue = parseFloat(approvalFee);

    if (isNaN(feeValue)) {
      setValidationError('Por favor ingresa un monto válido.');
      return;
    }

    if (feeValue < 0) {
      setValidationError('El monto debe ser mayor o igual a 0.');
      return;
    }

    if (feeValue > 1000) {
      setValidationError('El monto no puede ser mayor a $1000 USD.');
      return;
    }

    updateMutation.mutate(approvalFee);
  };

  const currentFee = data?.data?.approvalFee || '0.00';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Administra los parámetros globales del sistema de afiliados.
        </p>
      </div>

      {/* Personal Settings */}
      <Settings />

      <div className="border-t my-8" />

      {/* Referral Approval Fee Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Monto de Aprobación de Referidos</CardTitle>
          </div>
          <CardDescription>
            Configura el monto fijo que se cobrará a los afiliados cuando aprueben un referido.
            Este monto se transfiere del wallet del afiliado al wallet del administrador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <AlertDescription>
              <strong>Importante:</strong> Este monto será cobrado automáticamente cada vez que un
              afiliado apruebe un referido. El afiliado debe tener saldo suficiente en su wallet
              para poder aprobar referidos.
            </AlertDescription>
          </Alert>

          {/* Current Fee Display */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Error al cargar la configuración. Por favor intenta nuevamente.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Monto Actual de Aprobación</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cobrado a afiliados al aprobar referidos
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">${currentFee} USD</p>
                </div>
              </div>
            </div>
          )}

          {/* Update Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approvalFee">Nuevo Monto de Aprobación (USD)</Label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="approvalFee"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000"
                      value={approvalFee}
                      onChange={(e) => {
                        setApprovalFee(e.target.value);
                        setValidationError(null);
                      }}
                      placeholder="10.00"
                      className="pl-7"
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  {validationError && (
                    <p className="text-sm text-red-600 mt-1">{validationError}</p>
                  )}
                </div>
                <Button type="submit" disabled={updateMutation.isPending || isLoading}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Actualizar Monto
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                Este cambio será efectivo inmediatamente para todas las nuevas aprobaciones de
                referidos.
              </p>
              <p>
                Los referidos ya aprobados no se verán afectados por este cambio.
              </p>
            </div>
          </form>

          {/* Configuration History (Optional) */}
          {data?.data && (
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <h4 className="font-semibold">Información de Configuración</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Efectivo desde:</span>{' '}
                  {new Date(data.data.effectiveFrom).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Última actualización:</span>{' '}
                  {new Date(data.data.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Settings (Future) */}
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones Adicionales</CardTitle>
          <CardDescription>
            Más opciones de configuración estarán disponibles próximamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configuraciones futuras: porcentajes de comisión, niveles de afiliados, restricciones
            de aprobación, etc.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
