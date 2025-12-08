import {
  LayoutDashboard,
  Users,
  Settings,
  DollarSign,
  ArrowLeftRight,
  Wallet,
  UserCheck,
  Cog,
  Briefcase,
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
    matchSubPaths: true,
  },
  {
    title: t('navigation.providers'),
    href: '/dashboard/admin/providers',
    icon: Briefcase,
    description: t('navigation.providerManagement'),
    matchSubPaths: true,
  },
  {
    title: t('navigation.affiliates'),
    href: '/dashboard/admin/affiliates',
    icon: UserCheck,
    description: t('navigation.affiliateManagement'),
    matchSubPaths: true,
  },
  {
    title: t('navigation.recharges'),
    href: '/dashboard/admin/recharges',
    icon: Wallet,
    description: t('navigation.rechargeManagement'),
    matchSubPaths: true,
  },
  {
    title: t('navigation.commissions'),
    href: '/dashboard/admin/commissions',
    icon: Settings,
    description: t('navigation.commissionConfig'),
    matchSubPaths: true,
  },
  {
    title: t('navigation.transactions'),
    href: '/dashboard/admin/transactions',
    icon: ArrowLeftRight,
    description: t('navigation.transactionMonitoring'),
    matchSubPaths: true,
  },
  {
    title: 'Configuración',
    href: '/dashboard/admin/settings',
    icon: Cog,
    description: 'Configuración del sistema',
    matchSubPaths: true,
  },
];
