'use client';

import { Suspense } from 'react';
import { RestrictedRegisterForm } from '@/components/auth/RestrictedRegisterForm';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeSelector } from '@/components/ThemeSelector';

export default function ValidatorRegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-blue-950" suppressHydrationWarning>
            <div className="absolute top-4 right-4" suppressHydrationWarning>
                <div className="flex gap-2">
                    <LanguageSelector />
                    <ThemeSelector />
                </div>
            </div>
            <Suspense fallback={<div>Loading...</div>}>
                <RestrictedRegisterForm allowedRole="payment_validator" />
            </Suspense>
        </div>
    );
}
