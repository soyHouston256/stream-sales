'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp, Link as LinkIcon } from 'lucide-react';

export default function AffiliateDashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Referidos Activos',
      value: '45',
      icon: Users,
      description: '8 nuevos este mes',
    },
    {
      title: 'Comisiones',
      value: '$1,250',
      icon: DollarSign,
      description: 'Este mes',
    },
    {
      title: 'Tasa de Conversión',
      value: '12.5%',
      icon: TrendingUp,
      description: '+2.1% vs mes anterior',
    },
    {
      title: 'Enlaces',
      value: '8',
      icon: LinkIcon,
      description: 'Enlaces activos',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Afiliado</h1>
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
          <CardTitle>Panel de Afiliados</CardTitle>
          <CardDescription>
            Gestiona tus referidos y maximiza tus comisiones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Crea enlaces de referido, rastrea tus conversiones y monitorea tus earnings desde este panel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
