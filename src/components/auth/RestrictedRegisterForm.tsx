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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api/client';
import type { UserRole } from '@/types/auth';
import { Shield, ShieldCheck } from 'lucide-react';

// Register form validation schema
const registerSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    email: z
        .string()
        .min(1, 'El email es requerido')
        .email('Email inválido'),
    password: z
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .max(128, 'La contraseña no puede exceder 128 caracteres')
        .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
        .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
        .regex(/[0-9]/, 'Debe contener al menos un número')
        .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Debe contener al menos un carácter especial (!@#$%^&*...)'),
    confirmPassword: z
        .string()
        .min(1, 'Confirma tu contraseña'),
    role: z.enum(['provider', 'payment_validator'], {
        required_error: 'Rol no válido',
    }),
    countryCode: z.string().optional(),
    phoneNumber: z.string().optional(),
    username: z
        .string()
        .min(3, 'El usuario debe tener al menos 3 caracteres')
        .max(20, 'El usuario no puede tener más de 20 caracteres')
        .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guión bajo')
        .optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const roleConfig: Record<string, { label: string; description: string; color: string }> = {
    provider: {
        label: 'Proveedor',
        description: 'Crea y vende productos digitales en la plataforma',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    },
    payment_validator: {
        label: 'Validador de Pagos',
        description: 'Valida recargas y retiros de dinero en el sistema',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    },
};

interface RestrictedRegisterFormProps {
    allowedRole: 'provider' | 'payment_validator';
}

export function RestrictedRegisterForm({ allowedRole }: RestrictedRegisterFormProps) {
    const router = useRouter();
    const { register: registerUser } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);
    // eslint-disable-next-line security/detect-object-injection
    const config = roleConfig[allowedRole];

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        mode: 'onTouched', // Validate when field is touched
        reValidateMode: 'onChange', // Re-validate on change after first validation
        defaultValues: {
            role: allowedRole,
            countryCode: '+51',
        },
    });

    const watchedEmail = watch('email');
    const watchedUsername = watch('username');

    // Auto-fill username from email
    useEffect(() => {
        if (!isUsernameManuallyEdited && watchedEmail) {
            const emailParts = watchedEmail.split('@');
            if (emailParts.length > 0 && emailParts[0]) {
                const autoUsername = emailParts[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
                if (autoUsername !== watchedUsername) {
                    setValue('username', autoUsername, { shouldValidate: true });
                }
            }
        }
    }, [watchedEmail, isUsernameManuallyEdited, setValue, watchedUsername]);

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);

        try {
            const response = await registerUser(data);

            toast({
                title: 'Registro exitoso',
                description: `Tu cuenta de ${config.label} ha sido creada correctamente`,
            });

            if (response && response.user) {
                const dashboardRoute = getDashboardRoute(response.user.role);
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
                <div className="flex items-center justify-center gap-2 mb-2">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <Badge className={config.color}>{config.label}</Badge>
                </div>
                <CardTitle className="text-2xl font-bold text-center">
                    Registro de {config.label}
                </CardTitle>
                <CardDescription className="text-center">
                    {config.description}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    {/* Hidden role field */}
                    <input type="hidden" {...register('role')} value={allowedRole} />

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
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive" role="alert">
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
                        />
                        {errors.username && (
                            <p className="text-sm text-destructive" role="alert">
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
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive" role="alert">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Min 8 chars, mayúscula, número y carácter especial"
                            autoComplete="new-password"
                            disabled={isLoading}
                            {...register('password')}
                            aria-invalid={errors.password ? 'true' : 'false'}
                        />
                        {errors.password && (
                            <p className="text-sm text-destructive" role="alert">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Repite tu contraseña"
                            autoComplete="new-password"
                            disabled={isLoading}
                            {...register('confirmPassword')}
                            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                        />
                        {errors.confirmPassword && (
                            <p className="text-sm text-destructive" role="alert">
                                {errors.confirmPassword.message}
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
                                <option value="+54">🇦🇷 +54</option>
                                <option value="+56">🇨🇱 +56</option>
                                <option value="+55">🇧🇷 +55</option>
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
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Creando cuenta...' : `Registrarme como ${config.label}`}
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
