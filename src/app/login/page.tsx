'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function LoginPage() {
  // No redirects here - LoginForm handles redirect after successful login

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <LoginForm />
    </div>
  );
}
