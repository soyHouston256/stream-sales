'use client';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function RegisterPage() {
  // No redirect logic here - RegisterForm handles redirect after successful registration

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <RegisterForm />
    </div>
  );
}
