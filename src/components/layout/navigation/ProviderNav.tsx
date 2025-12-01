import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const getProviderNavItems = (t: (key: string) => string): NavItem[] => [
  {
    title: t('navigation.dashboard'),
    href: '/dashboard/provider',
    icon: LayoutDashboard,
    description: t('navigation.overviewStats'),
  },
  {
    title: t('navigation.products'),
    href: '/dashboard/provider/products',
    icon: Package,
    description: t('navigation.manageProducts'),
    matchSubPaths: true,
  },
  {
    title: t('navigation.sales'),
    href: '/dashboard/provider/sales',
    icon: ShoppingCart,
    description: t('navigation.salesHistory'),
    matchSubPaths: true,
  },
  {
    title: t('navigation.earnings'),
    href: '/dashboard/provider/earnings',
    icon: DollarSign,
    description: t('navigation.balanceWithdrawals'),
    matchSubPaths: true,
  },
  {
    title: t('navigation.settings'),
    href: '/dashboard/provider/settings',
    icon: Settings,
    description: t('navigation.accountSettings'),
    matchSubPaths: true,
  },
];
