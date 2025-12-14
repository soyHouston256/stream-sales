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
  countryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  username: z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(20, 'El usuario no puede tener más de 20 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo')
    .optional(),
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
    label: 'Partner',
    description: 'Refiere vendedores y gana comisiones',
  },
];

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);

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
      countryCode: '+51', // Default to Peru
    },
  });

  const selectedRole = watch('role');
  const watchedEmail = watch('email');
  const watchedUsername = watch('username');

  // Auto-fill username from email
  useEffect(() => {
    // Only auto-fill if the user hasn't manually edited the username
    if (!isUsernameManuallyEdited && watchedEmail) {
      const emailParts = watchedEmail.split('@');
      if (emailParts.length > 0 && emailParts[0]) {
        // Clean username: remove special chars, keep alphanumeric and underscore
        const autoUsername = emailParts[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

        // Only update if it's different to avoid loops/unnecessary renders
        if (autoUsername !== watchedUsername) {
          setValue('username', autoUsername, { shouldValidate: true });
        }
      }
    }
  }, [watchedEmail, isUsernameManuallyEdited, setValue, watchedUsername]);

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
            <Label htmlFor="username">Nombre de Usuario</Label>
            <Input
              id="username"
              type="text"
              placeholder="juan_perez"
              autoComplete="username"
              disabled={isLoading}
              {...register('username', {
                onChange: () => setIsUsernameManuallyEdited(true)
              })}
              aria-invalid={errors.username ? 'true' : 'false'}
              aria-describedby={errors.username ? 'username-error' : undefined}
            />
            {errors.username && (
              <p
                id="username-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.username.message}
              </p>
            )}
          </div>

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

          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1 space-y-2">
              <Label htmlFor="countryCode">País</Label>
              <select
                id="countryCode"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
                {...register('countryCode')}
              >
                <option value="+51">🇵🇪 +51</option>
                <option value="+591">🇧🇴 +591</option>
                <option value="+52">🇲🇽 +52</option>
                <option value="+593">🇪🇨 +593</option>
                <option value="+57">🇨🇴 +57</option>
                <option value="+502">🇬🇹 +502</option>
                <option value="+503">🇸🇻 +503</option>
                <option value="+54">🇦🇷 +54</option>
                <option value="+56">🇨🇱 +56</option>
                <option value="+55">🇧🇷 +55</option>
                <option value="+506">🇨🇷 +506</option>
                <option value="+53">🇨🇺 +53</option>
                <option value="+504">🇭🇳 +504</option>
                <option value="+505">🇳🇮 +505</option>
                <option value="+507">🇵🇦 +507</option>
                <option value="+595">🇵🇾 +595</option>
                <option value="+1">🇵🇷 +1</option>
                <option value="+1">🇩🇴 +1</option>
                <option value="+598">🇺🇾 +598</option>
                <option value="+58">🇻🇪 +58</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="">Otro</option>
              </select>
            </div>
            <div className="col-span-3 space-y-2">
              <Label htmlFor="phoneNumber">Celular</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="999 999 999"
                autoComplete="tel"
                disabled={isLoading}
                {...register('phoneNumber')}
              />
            </div>
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
