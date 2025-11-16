import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const providerNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/provider',
    icon: LayoutDashboard,
    description: 'Overview and statistics',
  },
  {
    title: 'Products',
    href: '/dashboard/provider/products',
    icon: Package,
    description: 'Manage your products',
  },
  {
    title: 'Sales',
    href: '/dashboard/provider/sales',
    icon: ShoppingCart,
    description: 'Sales history',
  },
  {
    title: 'Earnings',
    href: '/dashboard/provider/earnings',
    icon: DollarSign,
    description: 'Balance and withdrawals',
  },
  {
    title: 'Settings',
    href: '/dashboard/provider/settings',
    icon: Settings,
    description: 'Account settings',
  },
];
