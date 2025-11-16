import {
  LayoutDashboard,
  Users,
  Settings,
  DollarSign,
  ArrowLeftRight,
  Wallet,
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
    title: 'Recargas',
    href: '/dashboard/admin/recharges',
    icon: Wallet,
    description: 'Gestión de recargas de saldo',
  },
  {
    title: 'Comisiones',
    href: '/dashboard/admin/commissions',
    icon: Settings,
    description: 'Configuración de comisiones',
  },
  {
    title: 'Transacciones',
    href: '/dashboard/admin/transactions',
    icon: ArrowLeftRight,
    description: 'Monitoreo de transacciones',
  },
];
