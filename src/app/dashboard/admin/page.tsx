'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { Users, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { SalesChart } from '@/components/admin/SalesChart';
import { useAdminStats, useSalesData } from '@/lib/hooks/useAdminStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: salesData = [], isLoading: salesLoading } = useSalesData(7);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Administrador</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenido, {user?.name || user?.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Usuarios"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          isLoading={statsLoading}
          trend={
            stats?.usersGrowth
              ? {
                  value: stats.usersGrowth,
                  isPositive: stats.usersGrowth > 0,
                }
              : undefined
          }
        />
        <StatsCard
          title="Total Ventas"
          value={`$${stats?.totalSales ? parseFloat(stats.totalSales).toFixed(2) : '0.00'}`}
          icon={DollarSign}
          isLoading={statsLoading}
          trend={
            stats?.salesGrowth
              ? {
                  value: stats.salesGrowth,
                  isPositive: stats.salesGrowth > 0,
                }
              : undefined
          }
        />
        <StatsCard
          title="Comisiones Generadas"
          value={`$${stats?.totalCommissions ? parseFloat(stats.totalCommissions).toFixed(2) : '0.00'}`}
          icon={TrendingUp}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Disputas Activas"
          value={stats?.activeDisputes ?? 0}
          icon={AlertCircle}
          isLoading={statsLoading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SalesChart data={salesData} isLoading={salesLoading} />

        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Accede rápidamente a las funciones principales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/admin/users" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Gestionar Usuarios
              </Button>
            </Link>
            <Link href="/dashboard/admin/commissions" className="block">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Configurar Comisiones
              </Button>
            </Link>
            <Link href="/dashboard/admin/transactions" className="block">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Ver Transacciones
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
