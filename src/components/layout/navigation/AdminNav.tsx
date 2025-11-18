import {
  LayoutDashboard,
  Users,
  Settings,
  DollarSign,
  ArrowLeftRight,
  Wallet,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const getAdminNavItems = (t: (key: string) => string): NavItem[] => [
  {
    title: t('navigation.dashboard'),
    href: '/dashboard/admin',
    icon: LayoutDashboard,
    description: t('navigation.systemOverview'),
  },
  {
    title: t('navigation.users'),
    href: '/dashboard/admin/users',
    icon: Users,
    description: t('navigation.userManagement'),
  },
  {
    title: t('navigation.recharges'),
    href: '/dashboard/admin/recharges',
    icon: Wallet,
    description: t('navigation.rechargeManagement'),
  },
  {
    title: t('navigation.commissions'),
    href: '/dashboard/admin/commissions',
    icon: Settings,
    description: t('navigation.commissionConfig'),
  },
  {
    title: t('navigation.transactions'),
    href: '/dashboard/admin/transactions',
    icon: ArrowLeftRight,
    description: t('navigation.transactionMonitoring'),
  },
];
