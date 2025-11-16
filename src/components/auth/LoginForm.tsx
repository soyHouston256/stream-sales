'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';

import { useAuth } from '@/lib/auth/useAuth';
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
  const { login, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
      await login(data);

      toast({
        title: 'Inicio de sesión exitoso',
        description: 'Bienvenido de vuelta',
      });

      // After successful login, the AuthContext will update the user
      // We need to wait a brief moment for the context to update before accessing user.role
      // This is a more reliable approach than using window.location.reload()
      setTimeout(() => {
        // At this point, the context should have the updated user
        // We'll use a small delay to ensure React has updated the state
        const token = localStorage.getItem('token');
        if (token) {
          // Call the API to get current user and redirect based on role
          fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
            .then(res => res.json())
            .then(data => {
              if (data.user) {
                const dashboardRoute = getDashboardRoute(data.user.role);
                router.push(dashboardRoute);
              }
            })
            .catch(() => {
              // Fallback to default dashboard if API call fails
              router.push('/dashboard/seller');
            });
        }
      }, 100);
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
        title: 'Error al iniciar sesión',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Iniciar Sesión
        </CardTitle>
        <CardDescription className="text-center">
          Ingresa tu email y contraseña para acceder
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              disabled={isLoading}
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p
                id="email-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
              {...register('password')}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <p
                id="password-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            ¿No tienes una cuenta?{' '}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Regístrate aquí
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
