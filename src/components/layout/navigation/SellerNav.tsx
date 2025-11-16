import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Wallet,
  Settings,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const sellerNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/seller',
    icon: LayoutDashboard,
    description: 'Overview and statistics',
  },
  {
    title: 'Marketplace',
    href: '/dashboard/seller/marketplace',
    icon: ShoppingBag,
    description: 'Browse and buy products',
  },
  {
    title: 'My Purchases',
    href: '/dashboard/seller/purchases',
    icon: Package,
    description: 'Purchase history and credentials',
  },
  {
    title: 'My Wallet',
    href: '/dashboard/seller/wallet',
    icon: Wallet,
    description: 'Balance and transactions',
  },
  {
    title: 'Settings',
    href: '/dashboard/seller/settings',
    icon: Settings,
    description: 'Account settings',
  },
];
