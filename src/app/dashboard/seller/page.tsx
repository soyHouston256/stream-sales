'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ShoppingCart, Download, Users } from 'lucide-react';

export default function SellerDashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Balance',
      value: '$850',
      icon: Wallet,
      description: 'Disponible para compras',
    },
    {
      title: 'Compras',
      value: '28',
      icon: ShoppingCart,
      description: 'Productos adquiridos',
    },
    {
      title: 'Descargas',
      value: '42',
      icon: Download,
      description: 'Archivos descargados',
    },
    {
      title: 'Referidos',
      value: '12',
      icon: Users,
      description: 'Afiliados activos',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Vendedor</h1>
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
          <CardTitle>Panel de Vendedor</CardTitle>
          <CardDescription>
            Gestiona tus compras y recargas de balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Solicita recargas, compra productos, descarga tus archivos y gestiona tus afiliados desde aquí.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
