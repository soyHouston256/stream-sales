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
import { useLanguage } from '@/contexts/LanguageContext';
import type { UserRole } from '@/types/auth';

// Register form validation schema - messages will be overridden with i18n
const createRegisterSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('auth.registerForm.validation.nameRequired')),
  email: z
    .string()
    .min(1, t('auth.registerForm.validation.emailRequired'))
    .email(t('auth.registerForm.validation.emailInvalid')),
  password: z
    .string()
    .min(6, t('auth.registerForm.validation.passwordMinLength')),
  role: z.enum(['admin', 'provider', 'seller', 'affiliate', 'conciliator', 'payment_validator'], {
    required_error: t('auth.registerForm.validation.roleRequired'),
  }),
  referralCode: z.string().optional(),
  countryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  username: z
    .string()
    .min(3, t('auth.registerForm.validation.usernameMinLength'))
    .max(20, t('auth.registerForm.validation.usernameMaxLength'))
    .regex(/^[a-zA-Z0-9_]+$/, t('auth.registerForm.validation.usernamePattern'))
    .optional(),
});

type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);
  const [referralFromUrl, setReferralFromUrl] = useState(false);

  const roleOptions: { value: UserRole; label: string; description: string }[] = [
    {
      value: 'seller',
      label: t('auth.registerForm.roles.seller'),
      description: t('auth.registerForm.roles.sellerDesc'),
    },
    {
      value: 'affiliate',
      label: t('auth.registerForm.roles.affiliate'),
      description: t('auth.registerForm.roles.affiliateDesc'),
    },
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(createRegisterSchema(t)),
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
      setReferralFromUrl(true);
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      const response = await registerUser(data);

      toast({
        title: t('auth.registerForm.success.title'),
        description: t('auth.registerForm.success.description'),
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

      let errorMessage = t('auth.registerForm.errors.genericError');

      if (error instanceof ApiError) {
        if (error.status === 409 || error.message.includes('already exists')) {
          errorMessage = t('auth.registerForm.errors.emailExists');
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: t('auth.registerError'),
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
          {t('auth.registerForm.title')}
        </CardTitle>
        <CardDescription className="text-center">
          {t('auth.registerForm.subtitle')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.registerForm.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.registerForm.emailPlaceholder')}
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
            <Label htmlFor="username">{t('auth.registerForm.username')}</Label>
            <Input
              id="username"
              type="text"
              placeholder={t('auth.registerForm.usernamePlaceholder')}
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
            <Label htmlFor="name">{t('auth.registerForm.fullName')}</Label>
            <Input
              id="name"
              type="text"
              placeholder={t('auth.registerForm.fullNamePlaceholder')}
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
            <Label htmlFor="password">{t('auth.registerForm.password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('auth.registerForm.passwordPlaceholder')}
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
              <Label htmlFor="countryCode">{t('auth.registerForm.country')}</Label>
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
                <option value="">{t('auth.registerForm.other')}</option>
              </select>
            </div>
            <div className="col-span-3 space-y-2">
              <Label htmlFor="phoneNumber">{t('auth.registerForm.phone')}</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder={t('auth.registerForm.phonePlaceholder')}
                autoComplete="tel"
                disabled={isLoading}
                {...register('phoneNumber')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t('auth.registerForm.accountType')}</Label>
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
              {t('auth.registerForm.referralCode')}{' '}
              <span className="text-muted-foreground">({t('auth.registerForm.referralCodeOptional')})</span>
            </Label>
            <Input
              id="referralCode"
              type="text"
              placeholder={t('auth.registerForm.referralCodePlaceholder')}
              disabled={isLoading || referralFromUrl}
              className={referralFromUrl ? 'bg-muted cursor-not-allowed' : ''}
              {...register('referralCode')}
            />
            {referralFromUrl && (
              <p className="text-xs text-muted-foreground">
                {t('auth.registerForm.referralCodeApplied')}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('auth.registerForm.creatingAccount') : t('auth.registerForm.createAccountBtn')}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            {t('auth.registerForm.haveAccount')}{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              {t('auth.registerForm.loginHere')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
