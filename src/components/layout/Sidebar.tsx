'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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
function NavigationContent({ items, onNavClick }: { items: NavItem[]; onNavClick?: () => void }) {
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
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size changes
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close mobile menu on navigation
  const handleNavClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Mobile: Hamburger Menu Button - Fixed position */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-background shadow-md hover:scale-105 transition-transform duration-200"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 p-0"
            onInteractOutside={() => setOpen(false)}
          >
            <SheetHeader className="border-b p-4">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <NavigationContent items={items} onNavClick={handleNavClick} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Fixed Sidebar */}
      <aside className="hidden md:block w-64 border-r bg-muted/10">
        <NavigationContent items={items} />
      </aside>
    </>
  );
}
