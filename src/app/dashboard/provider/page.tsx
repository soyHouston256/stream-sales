'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, Wallet, ShoppingCart } from 'lucide-react';

export default function ProviderDashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Productos Activos',
      value: '24',
      icon: Package,
      description: '3 nuevos este mes',
    },
    {
      title: 'Ventas Totales',
      value: '$12,450',
      icon: TrendingUp,
      description: '+18% desde el mes pasado',
    },
    {
      title: 'Balance',
      value: '$3,250',
      icon: Wallet,
      description: 'Disponible para retiro',
    },
    {
      title: 'Pedidos',
      value: '143',
      icon: ShoppingCart,
      description: 'Este mes',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Proveedor</h1>
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
          <CardTitle>Gestión de Productos</CardTitle>
          <CardDescription>
            Crea, gestiona y vende tus productos digitales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Administra tu catálogo de productos, analiza tus ventas y monitorea tu billetera desde este panel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
