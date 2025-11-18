import {
  LayoutDashboard,
  Inbox,
  History,
  Settings,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const getConciliatorNavItems = (t: (key: string) => string): NavItem[] => [
  {
    title: t('navigation.dashboard'),
    href: '/dashboard/conciliator',
    icon: LayoutDashboard,
    description: t('navigation.quickStats'),
  },
  {
    title: t('navigation.allDisputes'),
    href: '/dashboard/conciliator/disputes',
    icon: Inbox,
    description: t('navigation.manageDisputes'),
  },
  {
    title: t('navigation.myHistory'),
    href: '/dashboard/conciliator/history',
    icon: History,
    description: t('navigation.resolutionHistory'),
  },
  {
    title: t('navigation.settings'),
    href: '/dashboard/conciliator/settings',
    icon: Settings,
    description: t('navigation.accountSettings'),
  },
];
