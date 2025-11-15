import {
  LayoutDashboard,
  Package,
  TrendingUp,
  Wallet,
  MessageSquare,
  FileText,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const providerNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/provider',
    icon: LayoutDashboard,
    description: 'Vista general',
  },
  {
    title: 'Mis Productos',
    href: '/dashboard/provider/products',
    icon: Package,
    description: 'Gestión de productos',
  },
  {
    title: 'Ventas',
    href: '/dashboard/provider/sales',
    icon: TrendingUp,
    description: 'Analytics de ventas',
  },
  {
    title: 'Billetera',
    href: '/dashboard/provider/wallet',
    icon: Wallet,
    description: 'Balance y transacciones',
  },
  {
    title: 'Comisiones',
    href: '/dashboard/provider/commissions',
    icon: FileText,
    description: 'Reportes de comisiones',
  },
  {
    title: 'Soporte',
    href: '/dashboard/provider/support',
    icon: MessageSquare,
    description: 'Tickets de soporte',
  },
];
