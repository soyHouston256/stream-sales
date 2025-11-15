'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, DollarSign, FileCheck } from 'lucide-react';

export default function ConciliatorDashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Pendientes',
      value: '18',
      icon: Clock,
      description: 'Validaciones en cola',
    },
    {
      title: 'Completadas Hoy',
      value: '42',
      icon: CheckCircle,
      description: '+15% vs ayer',
    },
    {
      title: 'Ingresos del Mes',
      value: '$420',
      icon: DollarSign,
      description: '+8% vs mes anterior',
    },
    {
      title: 'Total Validadas',
      value: '1,234',
      icon: FileCheck,
      description: 'Histórico',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Validador</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenido, {user?.name || user?.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Panel de Validación</CardTitle>
          <CardDescription>
            Valida pagos y transacciones del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Procesa la cola de validación, verifica pagos y gestiona cuentas bancarias desde este panel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
