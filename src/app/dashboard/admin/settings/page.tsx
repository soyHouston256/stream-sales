'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Loader2, CheckCircle, AlertTriangle, Copy, Link2, ShieldCheck, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tokenManager } from '@/lib/utils/tokenManager';
import { ExchangeRateConfig } from '@/components/admin/ExchangeRateConfig';

export default function AdminSettingsPage() {
  const [approvalFee, setApprovalFee] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get base URL for links
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const registrationLinks = [
    {
      role: 'provider',
      label: 'Proveedor',
      description: 'Usuarios que crean y venden productos digitales',
      path: '/register/provider',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      role: 'payment_validator',
      label: 'Validador de Pagos',
      description: 'Usuarios que validan recargas y retiros',
      path: '/register/validator',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
  ];

  const copyToClipboard = async (path: string, label: string) => {
    const fullUrl = `${baseUrl}${path}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast({
        title: '¡Enlace copiado!',
        description: `El enlace de registro de ${label} ha sido copiado al portapapeles.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el enlace.',
        variant: 'destructive',
      });
    }
  };

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
          Administra los parámetros globales del sistema.
        </p>
      </div>

      {/* Personal Settings */}
      <Settings />

      <div className="border-t my-8" />

      {/* Registration Links Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <CardTitle>Enlaces de Registro Restringido</CardTitle>
          </div>
          <CardDescription>
            Comparte estos enlaces con personas específicas para que se registren con roles especiales.
            Estos roles no están disponibles en el registro público.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Estos enlaces permiten el registro directo con roles privilegiados.
              Compártelos solo con personas de confianza.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {registrationLinks.map((link) => (
              <div
                key={link.role}
                className={`rounded-lg border p-4 ${link.bgColor}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link2 className={`h-4 w-4 ${link.color}`} />
                      <h4 className={`font-semibold ${link.color}`}>{link.label}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {link.description}
                    </p>
                    <code className="text-xs mt-2 block bg-background/80 px-2 py-1 rounded border truncate">
                      {baseUrl}{link.path}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(link.path, link.label)}
                    className="ml-4 shrink-0"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Referral Approval Fee Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Monto de Aprobación de Referidos</CardTitle>
          </div>
          <CardDescription>
            Configura el monto fijo que se cobrará a los partners cuando aprueben un referido.
            Este monto se transfiere del wallet del partner al wallet del administrador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <AlertDescription>
              <strong>Importante:</strong> Este monto será cobrado automáticamente cada vez que un
              partner apruebe un referido. El partner debe tener saldo suficiente en su wallet
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
                    Cobrado a partners al aprobar referidos
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

      {/* Exchange Rate Configuration */}
      <ExchangeRateConfig />

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
            Configuraciones futuras: porcentajes de comisión, niveles de partners, restricciones
            de aprobación, etc.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

