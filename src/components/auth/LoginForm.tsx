'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';

import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDashboardRoute } from '@/lib/utils/roleRedirect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api/client';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

// Login form validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const { login, user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const response = await login(data);

      toast({
        title: t('auth.loginSuccess'),
        description: t('auth.welcomeBack'),
      });

      // After successful login, redirect to appropriate dashboard based on user role
      if (response && response.user) {
        const dashboardRoute = getDashboardRoute(response.user.role);

        // Give a brief moment for the token to be saved to localStorage
        setTimeout(() => {
          if (returnTo) {
            window.location.href = returnTo;
          } else {
            window.location.href = dashboardRoute;
          }
        }, 200);
      }
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = 'Ocurrió un error al iniciar sesión';

      if (error instanceof ApiError) {
        if (error.status === 401) {
          errorMessage = 'Email o contraseña incorrectos';
        } else if (error.status === 404) {
          errorMessage = 'Usuario no encontrado';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: t('auth.loginError'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-none shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-500">
      <CardHeader className="space-y-3 pb-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/50 animate-in zoom-in-50 duration-700">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
          {t('auth.login')}
        </CardTitle>
        <CardDescription className="text-center text-base">
          {t('auth.welcomeBack')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2 animate-in slide-in-from-left-5 duration-500 delay-100">
            <Label htmlFor="email" className="text-sm font-medium">
              {t('auth.email')}
            </Label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={isLoading}
                {...register('email')}
                className={`pl-10 h-12 transition-all duration-200 ${
                  errors.email
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-indigo-500 focus-visible:border-indigo-500'
                }`}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </div>
            {errors.email && (
              <p
                id="email-error"
                className="text-sm text-red-500 flex items-center gap-1 animate-in slide-in-from-left-2"
                role="alert"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2 animate-in slide-in-from-left-5 duration-500 delay-200">
            <Label htmlFor="password" className="text-sm font-medium">
              {t('auth.password')}
            </Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                {...register('password')}
                className={`pl-10 pr-10 h-12 transition-all duration-200 ${
                  errors.password
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-indigo-500 focus-visible:border-indigo-500'
                }`}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p
                id="password-error"
                className="text-sm text-red-500 flex items-center gap-1 animate-in slide-in-from-left-2"
                role="alert"
              >
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-2 animate-in slide-in-from-bottom-5 duration-500 delay-300">
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-indigo-500/50 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/60 hover:scale-[1.02]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {`${t('common.loading')}...`}
              </>
            ) : (
              <>
                {t('auth.login')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">
                {t('auth.dontHaveAccount')}
              </span>
            </div>
          </div>

          <Link
            href="/register"
            className="w-full text-center py-3 px-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 hover:shadow-md"
          >
            {t('auth.register')}
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
