import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Wallet,
  Settings,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const getSellerNavItems = (t: (key: string) => string): NavItem[] => [
  {
    title: t('navigation.dashboard'),
    href: '/dashboard/seller',
    icon: LayoutDashboard,
    description: t('navigation.overviewStats'),
  },

  {
    title: t('navigation.myPurchases'),
    href: '/dashboard/seller/purchases',
    icon: Package,
    description: t('navigation.purchaseHistory'),
  },
  {
    title: t('navigation.myWallet'),
    href: '/dashboard/seller/wallet',
    icon: Wallet,
    description: t('navigation.balanceTransactions'),
  },
  {
    title: t('navigation.settings'),
    href: '/dashboard/seller/settings',
    icon: Settings,
    description: t('navigation.accountSettings'),
  },
];
