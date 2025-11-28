'use client';

import { Header } from './Header';
import { Sidebar, type NavItem } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
}

export function DashboardLayout({ children, navItems }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-4 md:p-6 overflow-auto pt-16 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
