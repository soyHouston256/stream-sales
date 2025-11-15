import {
  LayoutDashboard,
  ShoppingCart,
  Download,
  Wallet,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const sellerNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/seller',
    icon: LayoutDashboard,
    description: 'Vista general',
  },
  {
    title: 'Recargas',
    href: '/dashboard/seller/recharges',
    icon: Wallet,
    description: 'Solicitar recargas',
  },
  {
    title: 'Compras',
    href: '/dashboard/seller/purchases',
    icon: ShoppingCart,
    description: 'Historial de compras',
  },
  {
    title: 'Descargas',
    href: '/dashboard/seller/downloads',
    icon: Download,
    description: 'Productos descargados',
  },
  {
    title: 'Balance',
    href: '/dashboard/seller/balance',
    icon: TrendingUp,
    description: 'Tracking de balance',
  },
  {
    title: 'Afiliados',
    href: '/dashboard/seller/affiliates',
    icon: Users,
    description: 'Mis referidos',
  },
];
