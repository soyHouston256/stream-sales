import {
  LayoutDashboard,
  CheckCircle,
  CreditCard,
  Building2,
  History,
  DollarSign,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const conciliatorNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/conciliator',
    icon: LayoutDashboard,
    description: 'Vista general',
  },
  {
    title: 'Cola de Validación',
    href: '/dashboard/conciliator/queue',
    icon: CheckCircle,
    description: 'Validaciones pendientes',
  },
  {
    title: 'Verificar Pagos',
    href: '/dashboard/conciliator/payments',
    icon: CreditCard,
    description: 'Verificación de pagos',
  },
  {
    title: 'Cuentas Bancarias',
    href: '/dashboard/conciliator/accounts',
    icon: Building2,
    description: 'Gestión de cuentas',
  },
  {
    title: 'Historial',
    href: '/dashboard/conciliator/history',
    icon: History,
    description: 'Validaciones completadas',
  },
  {
    title: 'Ingresos',
    href: '/dashboard/conciliator/income',
    icon: DollarSign,
    description: 'Reportes de ingresos',
  },
];
