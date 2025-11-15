import {
  LayoutDashboard,
  Users,
  Settings,
  DollarSign,
  FileText,
  Activity,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const adminNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
    description: 'Vista general del sistema',
  },
  {
    title: 'Usuarios',
    href: '/dashboard/admin/users',
    icon: Users,
    description: 'Gestión de usuarios',
  },
  {
    title: 'Finanzas',
    href: '/dashboard/admin/finances',
    icon: DollarSign,
    description: 'Resumen financiero',
  },
  {
    title: 'Actividad',
    href: '/dashboard/admin/activity',
    icon: Activity,
    description: 'Monitoreo en tiempo real',
  },
  {
    title: 'Reportes',
    href: '/dashboard/admin/reports',
    icon: FileText,
    description: 'Reportes y auditoría',
  },
  {
    title: 'Configuración',
    href: '/dashboard/admin/settings',
    icon: Settings,
    description: 'Configuración del sistema',
  },
];
