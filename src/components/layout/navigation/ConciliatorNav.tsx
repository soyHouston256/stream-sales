import {
  LayoutDashboard,
  Inbox,
  History,
  Settings,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const conciliatorNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/conciliator',
    icon: LayoutDashboard,
    description: 'Overview and quick stats',
  },
  {
    title: 'All Disputes',
    href: '/dashboard/conciliator/disputes',
    icon: Inbox,
    description: 'Manage all disputes',
  },
  {
    title: 'My History',
    href: '/dashboard/conciliator/history',
    icon: History,
    description: 'Your resolution history',
  },
  {
    title: 'Settings',
    href: '/dashboard/conciliator/settings',
    icon: Settings,
    description: 'Account settings',
  },
];
