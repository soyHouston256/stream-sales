'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { NavigationContent, type NavItem } from './Sidebar';

interface MobileNavProps {
    items: NavItem[];
}

export function MobileNav({ items }: MobileNavProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden mr-2"
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
                    <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <NavigationContent items={items} onNavClick={() => setOpen(false)} />
            </SheetContent>
        </Sheet>
    );
}
