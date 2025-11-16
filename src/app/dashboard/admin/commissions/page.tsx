'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useCommissionConfig,
  useUpdateCommissionConfig,
  useCommissionHistory,
} from '@/lib/hooks/useCommissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, Column } from '@/components/admin/DataTable';
import { CommissionHistory } from '@/types/admin';
import { useToast } from '@/lib/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Settings, History } from 'lucide-react';

const commissionSchema = z.object({
  saleCommission: z
    .number()
    .min(0, 'Debe ser mayor o igual a 0')
    .max(100, 'Debe ser menor o igual a 100'),
  registrationCommission: z
    .number()
    .min(0, 'Debe ser mayor o igual a 0')
    .max(100, 'Debe ser menor o igual a 100'),
});

type CommissionFormData = z.infer<typeof commissionSchema>;

export default function CommissionsPage() {
  const { data: config, isLoading: configLoading } = useCommissionConfig();
  const { data: history = [], isLoading: historyLoading } = useCommissionHistory();
  const updateConfig = useUpdateCommissionConfig();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CommissionFormData>({
    resolver: zodResolver(commissionSchema),
    values: {
      saleCommission: config?.saleCommission ?? 0,
      registrationCommission: config?.registrationCommission ?? 0,
    },
  });

  const onSubmit = async (data: CommissionFormData) => {
    try {
      await updateConfig.mutateAsync(data);
      toast({
        title: 'Configuración actualizada',
        description: 'Los porcentajes de comisión se han actualizado correctamente.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración de comisiones.',
        variant: 'destructive',
      });
    }
  };

  const historyColumns: Column<CommissionHistory>[] = [
    {
      key: 'saleCommission',
      label: 'Comisión de Venta',
      render: (item) => <div>{item.saleCommission}%</div>,
    },
    {
      key: 'registrationCommission',
      label: 'Comisión de Registro',
      render: (item) => <div>{item.registrationCommission}%</div>,
    },
    {
      key: 'updatedBy',
      label: 'Actualizado Por',
      render: (item) => <div className="font-medium">{item.updatedBy}</div>,
    },
    {
      key: 'createdAt',
      label: 'Fecha de Cambio',
      render: (item) => (
        <div className="text-sm text-muted-foreground">
          {format(new Date(item.createdAt), 'dd MMM yyyy HH:mm', { locale: es })}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración de Comisiones</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona los porcentajes de comisión del sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Configuración Actual</CardTitle>
            </div>
            <CardDescription>
              Actualiza los porcentajes de comisión (0-100%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="saleCommission">
                    Comisión de Venta (%)
                  </Label>
                  <Input
                    id="saleCommission"
                    type="number"
                    step="0.01"
                    {...register('saleCommission', { valueAsNumber: true })}
                  />
                  {errors.saleCommission && (
                    <p className="text-sm text-destructive">
                      {errors.saleCommission.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationCommission">
                    Comisión de Registro (%)
                  </Label>
                  <Input
                    id="registrationCommission"
                    type="number"
                    step="0.01"
                    {...register('registrationCommission', {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.registrationCommission && (
                    <p className="text-sm text-destructive">
                      {errors.registrationCommission.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={updateConfig.isPending}
                    className="flex-1"
                  >
                    {updateConfig.isPending
                      ? 'Guardando...'
                      : 'Guardar Cambios'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset()}
                  >
                    Restablecer
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valores Actuales</CardTitle>
            <CardDescription>
              Configuración vigente del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Comisión de Venta
                  </div>
                  <div className="text-3xl font-bold mt-1">
                    {config?.saleCommission}%
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Comisión de Registro
                  </div>
                  <div className="text-3xl font-bold mt-1">
                    {config?.registrationCommission}%
                  </div>
                </div>
                {config?.updatedAt && (
                  <div className="text-sm text-muted-foreground">
                    Última actualización:{' '}
                    {format(new Date(config.updatedAt), 'dd MMM yyyy HH:mm', {
                      locale: es,
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle>Historial de Cambios</CardTitle>
          </div>
          <CardDescription>
            Registro de todas las modificaciones realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={history}
            columns={historyColumns}
            isLoading={historyLoading}
            emptyMessage="No hay historial de cambios"
          />
        </CardContent>
      </Card>
    </div>
  );
}
