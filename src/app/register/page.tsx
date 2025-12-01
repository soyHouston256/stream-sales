'use client';

import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeSelector } from '@/components/ThemeSelector';

export default function RegisterPage() {
  // No redirect logic here - RegisterForm handles redirect after successful registration

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="absolute top-4 right-4">
        <div className="flex gap-2">
          <LanguageSelector />
          <ThemeSelector />
        </div>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
