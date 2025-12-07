'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  matchSubPaths?: boolean;
}

interface SidebarProps {
  items: NavItem[];
}

// Navigation content shared between desktop sidebar and mobile sheet
export function NavigationContent({ items, onNavClick }: { items: NavItem[]; onNavClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.matchSubPaths
          ? (pathname === item.href || pathname.startsWith(`${item.href}/`))
          : pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
              'hover:scale-[1.02] active:scale-[0.98]',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ items }: SidebarProps) {
  return (
    <aside className="hidden md:block w-64 border-r bg-muted/10">
      <NavigationContent items={items} />
    </aside>
  );
}
