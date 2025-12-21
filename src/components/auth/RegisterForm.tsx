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
import {
  Mail,
  Lock,
  User,
  Phone,
  UserCircle,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';

// Register form validation schema - messages will be overridden with i18n
const createRegisterSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('auth.registerForm.validation.nameRequired')),
  email: z
    .string()
    .min(1, t('auth.registerForm.validation.emailRequired'))
    .email(t('auth.registerForm.validation.emailInvalid')),
  password: z
    .string()
    .min(8, t('auth.registerForm.validation.passwordMinLength'))
    .max(128, t('auth.registerForm.validation.passwordMaxLength'))
    .regex(/[A-Z]/, t('auth.registerForm.validation.passwordUppercase'))
    .regex(/[a-z]/, t('auth.registerForm.validation.passwordLowercase'))
    .regex(/[0-9]/, t('auth.registerForm.validation.passwordNumber'))
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, t('auth.registerForm.validation.passwordSpecial')),
  confirmPassword: z
    .string()
    .min(1, t('auth.registerForm.validation.confirmPasswordRequired')),
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
}).refine((data) => data.password === data.confirmPassword, {
  message: t('auth.registerForm.validation.passwordsDoNotMatch'),
  path: ['confirmPassword'],
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    mode: 'onTouched', // Validate when field is touched
    reValidateMode: 'onChange', // Re-validate on change after first validation
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
    <Card className="w-full max-w-lg border-none shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-500">
      <CardHeader className="space-y-3 pb-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/50 animate-in zoom-in-50 duration-700">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
          {t('auth.registerForm.title')}
        </CardTitle>
        <CardDescription className="text-center text-base">
          {t('auth.registerForm.subtitle')}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5">
          <div className="space-y-2 animate-in slide-in-from-left-5 duration-500 delay-100">
            <Label htmlFor="email" className="text-sm font-medium">{t('auth.registerForm.email')}</Label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
              <Input
                id="email"
                type="email"
                placeholder={t('auth.registerForm.emailPlaceholder')}
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

          <div className="space-y-2 animate-in slide-in-from-left-5 duration-500 delay-150">
            <Label htmlFor="username" className="text-sm font-medium">{t('auth.registerForm.username')}</Label>
            <div className="relative group">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
              <Input
                id="username"
                type="text"
                placeholder={t('auth.registerForm.usernamePlaceholder')}
                autoComplete="username"
                disabled={isLoading}
                {...register('username', {
                  onChange: () => setIsUsernameManuallyEdited(true)
                })}
                className={`pl-10 h-12 transition-all duration-200 ${
                  errors.username
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-indigo-500 focus-visible:border-indigo-500'
                }`}
                aria-invalid={errors.username ? 'true' : 'false'}
                aria-describedby={errors.username ? 'username-error' : undefined}
              />
            </div>
            {errors.username && (
              <p
                id="username-error"
                className="text-sm text-red-500 flex items-center gap-1 animate-in slide-in-from-left-2"
                role="alert"
              >
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2 animate-in slide-in-from-left-5 duration-500 delay-200">
            <Label htmlFor="name" className="text-sm font-medium">{t('auth.registerForm.fullName')}</Label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
              <Input
                id="name"
                type="text"
                placeholder={t('auth.registerForm.fullNamePlaceholder')}
                autoComplete="name"
                disabled={isLoading}
                {...register('name')}
                className={`pl-10 h-12 transition-all duration-200 ${
                  errors.name
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-indigo-500 focus-visible:border-indigo-500'
                }`}
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
            </div>
            {errors.name && (
              <p
                id="name-error"
                className="text-sm text-red-500 flex items-center gap-1 animate-in slide-in-from-left-2"
                role="alert"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2 animate-in slide-in-from-left-5 duration-500 delay-250">
            <Label htmlFor="password" className="text-sm font-medium">{t('auth.registerForm.password')}</Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.registerForm.passwordPlaceholder')}
                autoComplete="new-password"
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

          <div className="space-y-2 animate-in slide-in-from-left-5 duration-500 delay-300">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">{t('auth.registerForm.confirmPassword')}</Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('auth.registerForm.confirmPasswordPlaceholder')}
                autoComplete="new-password"
                disabled={isLoading}
                {...register('confirmPassword')}
                className={`pl-10 pr-10 h-12 transition-all duration-200 ${
                  errors.confirmPassword
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'focus-visible:ring-indigo-500 focus-visible:border-indigo-500'
                }`}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p
                id="confirmPassword-error"
                className="text-sm text-red-500 flex items-center gap-1 animate-in slide-in-from-left-2"
                role="alert"
              >
                {errors.confirmPassword.message}
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

        <CardFooter className="flex flex-col space-y-4 pt-2 animate-in slide-in-from-bottom-5 duration-500 delay-350">
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-indigo-500/50 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/60 hover:scale-[1.02]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('auth.registerForm.creatingAccount')}
              </>
            ) : (
              <>
                {t('auth.registerForm.createAccountBtn')}
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
                {t('auth.registerForm.haveAccount')}
              </span>
            </div>
          </div>

          <Link
            href="/login"
            className="w-full text-center py-3 px-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 hover:shadow-md"
          >
            {t('auth.registerForm.loginHere')}
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
