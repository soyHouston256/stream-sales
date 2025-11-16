'use client';

import { useState } from 'react';
import { useUsers } from '@/lib/hooks/useUsers';
import { DataTable, Column } from '@/components/admin/DataTable';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { User } from '@/types/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  seller: 'Vendedor',
  affiliate: 'Afiliado',
  provider: 'Proveedor',
  conciliator: 'Conciliador',
};

const roleColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  admin: 'destructive',
  seller: 'default',
  affiliate: 'secondary',
  provider: 'outline',
  conciliator: 'outline',
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data, isLoading } = useUsers({
    page,
    limit: 10,
    search: search || undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const columns: Column<User>[] = [
    {
      key: 'email',
      label: 'Email',
      render: (user) => (
        <div className="font-medium">{user.email}</div>
      ),
    },
    {
      key: 'name',
      label: 'Nombre',
      render: (user) => (
        <div>{user.name || <span className="text-muted-foreground">Sin nombre</span>}</div>
      ),
    },
    {
      key: 'role',
      label: 'Rol',
      render: (user) => (
        <Badge variant={roleColors[user.role] || 'default'}>
          {roleLabels[user.role] || user.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (user) => (
        <Badge variant={user.status === 'active' ? 'success' : 'warning'}>
          {user.status === 'active' ? 'Activo' : 'Suspendido'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Fecha de Registro',
      render: (user) => (
        <div className="text-sm text-muted-foreground">
          {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: es })}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (user) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUser(user);
            setEditDialogOpen(true);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
      className: 'w-[80px]',
    },
  ];

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <p className="text-muted-foreground mt-2">
          Administra los usuarios del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Busca y filtra usuarios por diferentes criterios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email o nombre..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={handleRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="seller">Vendedor</SelectItem>
                <SelectItem value="affiliate">Afiliado</SelectItem>
                <SelectItem value="provider">Proveedor</SelectItem>
                <SelectItem value="conciliator">Conciliador</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>
            Lista de todos los usuarios del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data?.data || []}
            columns={columns}
            isLoading={isLoading}
            pagination={
              data
                ? {
                    currentPage: data.pagination.page,
                    totalPages: data.pagination.totalPages,
                    onPageChange: setPage,
                  }
                : undefined
            }
            emptyMessage="No se encontraron usuarios"
          />
        </CardContent>
      </Card>

      <EditUserDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}
