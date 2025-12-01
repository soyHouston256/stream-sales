'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Lock, Save, Loader2 } from 'lucide-react';

import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeSelector } from '@/components/ThemeSelector';
import { apiClient } from '@/lib/api/client';

// Schemas
const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export function Settings() {
    const { user, refreshUser } = useAuth();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h2>
                <p className="text-muted-foreground">
                    {t('settings.profile')} & {t('settings.security')}
                </p>
            </div>

            <div className="flex space-x-2 border-b">
                <Button
                    variant={activeTab === 'profile' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('profile')}
                    className="rounded-b-none"
                >
                    <User className="mr-2 h-4 w-4" />
                    {t('settings.profile')}
                </Button>
                <Button
                    variant={activeTab === 'security' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('security')}
                    className="rounded-b-none"
                >
                    <Lock className="mr-2 h-4 w-4" />
                    {t('settings.security')}
                </Button>
            </div>

            {activeTab === 'profile' ? (
                <ProfileSettings user={user} refreshUser={refreshUser} t={t} />
            ) : (
                <SecuritySettings t={t} />
            )}
        </div>
    );
}

function ProfileSettings({ user, refreshUser, t }: { user: any, refreshUser: () => Promise<void>, t: any }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user?.name || '',
        },
    });

    const onSubmit = async (data: ProfileFormData) => {
        setIsLoading(true);
        try {
            await apiClient.put('/api/auth/profile', data);
            await refreshUser();
            toast({
                title: t('settings.successProfile'),
                description: t('settings.successProfile'),
            });
        } catch (error) {
            toast({
                title: t('common.error'),
                description: t('settings.errorProfile'),
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.profile')}</CardTitle>
                <CardDescription>{t('settings.profile')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">{t('settings.email')}</Label>
                    <Input id="email" value={user?.email || ''} disabled />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="name">{t('settings.name')}</Label>
                    <Input
                        id="name"
                        {...register('name')}
                        disabled={isLoading}
                    />
                    {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>{t('settings.language')}</Label>
                    <div className="pt-1">
                        <LanguageSelector />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Theme</Label>
                    <div className="pt-1">
                        <ThemeSelector />
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSubmit(onSubmit)} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('settings.saveChanges')}
                </Button>
            </CardFooter>
        </Card>
    );
}

function SecuritySettings({ t }: { t: any }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
    });

    const onSubmit = async (data: PasswordFormData) => {
        setIsLoading(true);
        try {
            await apiClient.put('/api/auth/password', data);
            reset();
            toast({
                title: t('settings.successPassword'),
                description: t('settings.successPassword'),
            });
        } catch (error: any) {
            toast({
                title: t('common.error'),
                description: error.message || t('settings.errorPassword'),
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.security')}</CardTitle>
                <CardDescription>{t('settings.changePassword')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t('settings.currentPassword')}</Label>
                    <Input
                        id="currentPassword"
                        type="password"
                        {...register('currentPassword')}
                        disabled={isLoading}
                    />
                    {errors.currentPassword && (
                        <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('settings.newPassword')}</Label>
                    <Input
                        id="newPassword"
                        type="password"
                        {...register('newPassword')}
                        disabled={isLoading}
                    />
                    {errors.newPassword && (
                        <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('settings.confirmPassword')}</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        {...register('confirmPassword')}
                        disabled={isLoading}
                    />
                    {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSubmit(onSubmit)} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('settings.changePassword')}
                </Button>
            </CardFooter>
        </Card>
    );
}
