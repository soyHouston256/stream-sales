'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, Activity, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Total Usuarios',
      value: '1,234',
      icon: Users,
      description: '+12% desde el mes pasado',
    },
    {
      title: 'Ingresos Totales',
      value: '$45,231',
      icon: DollarSign,
      description: '+20% desde el mes pasado',
    },
    {
      title: 'Actividad',
      value: '573',
      icon: Activity,
      description: 'Transacciones hoy',
    },
    {
      title: 'Crecimiento',
      value: '+12.5%',
      icon: TrendingUp,
      description: 'vs mes anterior',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Administrador</h1>
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
          <CardTitle>Vista General del Sistema</CardTitle>
          <CardDescription>
            Monitoreo y gestión centralizada de Stream Sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Desde aquí puedes gestionar usuarios, configurar el sistema, revisar finanzas y monitorear la actividad en tiempo real.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
