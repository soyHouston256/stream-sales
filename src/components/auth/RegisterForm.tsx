'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import type { UserRole } from '@/types/auth';

// Register form validation schema
const registerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Email inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['admin', 'provider', 'seller', 'affiliate', 'conciliator', 'payment_validator'], {
    required_error: 'Debes seleccionar un rol',
  }),
  referralCode: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const roleOptions: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'seller',
    label: 'Vendedor',
    description: 'Vende productos y gana comisiones',
  },
  {
    value: 'affiliate',
    label: 'Afiliado',
    description: 'Refiere vendedores y gana comisiones',
  },
  {
    value: 'provider',
    label: 'Proveedor',
    description: 'Crea y vende productos digitales',
  },
  {
    value: 'conciliator',
    label: 'Validador',
    description: 'Valida pagos y transacciones',
  },
  {
    value: 'payment_validator',
    label: 'Validador de Pagos',
    description: 'Valida recargas y retiros de dinero',
  },
  {
    value: 'admin',
    label: 'Administrador',
    description: 'Gestiona todo el sistema',
  },
];

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'seller',
    },
  });

  const selectedRole = watch('role');

  // Auto-populate referral code from URL parameter
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setValue('referralCode', refCode);
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      const response = await registerUser(data);

      toast({
        title: 'Registro exitoso',
        description: 'Tu cuenta ha sido creada correctamente',
      });

      // After successful registration, redirect to appropriate dashboard based on user role
      // Using window.location.href for full page reload to ensure AuthContext initializes properly
      if (response && response.user) {
        const dashboardRoute = getDashboardRoute(response.user.role);

        // Give a brief moment for the token to be saved to localStorage
        // then do a full page navigation (not client-side navigation)
        setTimeout(() => {
          window.location.href = dashboardRoute;
        }, 200);
      }
    } catch (error) {
      console.error('Registration error:', error);

      let errorMessage = 'Ocurrió un error al crear la cuenta';

      if (error instanceof ApiError) {
        if (error.status === 409 || error.message.includes('already exists')) {
          errorMessage = 'Este email ya está registrado';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: 'Error al registrarse',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Crear Cuenta
        </CardTitle>
        <CardDescription className="text-center">
          Completa tus datos para unirte a Stream Sales
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Juan Pérez"
              autoComplete="name"
              disabled={isLoading}
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p
                id="name-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.name.message}
              </p>
            )}
          </div>

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
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
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

          <div className="space-y-2">
            <Label htmlFor="role">Tipo de Cuenta</Label>
            <select
              id="role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              {...register('role')}
              aria-invalid={errors.role ? 'true' : 'false'}
              aria-describedby={errors.role ? 'role-error' : undefined}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
            {errors.role && (
              <p
                id="role-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.role.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="referralCode">
              Código de Referido{' '}
              <span className="text-muted-foreground">(Opcional)</span>
            </Label>
            <Input
              id="referralCode"
              type="text"
              placeholder="Ingresa un código si tienes uno"
              disabled={isLoading}
              {...register('referralCode')}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            ¿Ya tienes una cuenta?{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Inicia sesión aquí
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
