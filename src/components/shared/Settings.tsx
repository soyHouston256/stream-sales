'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Lock, Save, Loader2, Mail, Shield, Key, Camera, Phone, Globe } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeSelector } from '@/components/ThemeSelector';
import { apiClient } from '@/lib/api/client';

// Schemas
const profileSchema = z.object({
    name: z.string().min(2, 'settings.validation.nameLength'),
    username: z.string().min(3, 'settings.validation.usernameLength').max(20).regex(/^[a-zA-Z0-9_]+$/, 'settings.validation.usernameFormat').optional(),
    phoneNumber: z.string().optional(),
    countryCode: z.string().optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'settings.validation.passwordRequired'),
    newPassword: z.string().min(8, 'settings.validation.passwordLength'),
    confirmPassword: z.string().min(8, 'settings.validation.passwordLength'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "settings.validation.passwordMatch",
    path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export function Settings() {
    const { user, refreshUser } = useAuth();
    const { t } = useLanguage();

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-10">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h2>
                <p className="text-muted-foreground mt-1">
                    {t('settings.profile')} & {t('settings.security')}
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar / User Info Card */}
                <div className="w-full md:w-1/3 space-y-6">
                    <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                        <div className="h-32 bg-indigo-600/10 dark:bg-indigo-900/20 relative">
                            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                        </div>
                        <CardContent className="relative pt-0 text-center px-6 pb-8">
                            <div className="relative -mt-12 mb-4 inline-block">
                                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                                    <AvatarImage src={user?.image || undefined} />
                                    <AvatarFallback className="text-2xl font-bold bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md">
                                    <Camera className="h-4 w-4" />
                                </Button>
                            </div>

                            <h3 className="text-xl font-bold mb-1">{user?.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>

                            <div className="flex flex-wrap justify-center gap-2">
                                <Badge variant="secondary" className="capitalize">
                                    {user?.role}
                                </Badge>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                    {t('settings.active')}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{t('settings.preferences')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="flex flex-col gap-1">
                                    <span>{t('settings.language')}</span>
                                    <span className="font-normal text-xs text-muted-foreground">{t('settings.selectLanguage')}</span>
                                </Label>
                                <LanguageSelector />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <Label className="flex flex-col gap-1">
                                    <span>{t('settings.theme')}</span>
                                    <span className="font-normal text-xs text-muted-foreground">{t('settings.selectTheme')}</span>
                                </Label>
                                <ThemeSelector />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    <Tabs defaultValue="profile" className="w-full">
                        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-xl mb-6">
                            <TabsTrigger value="profile" className="flex-1 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                                <User className="mr-2 h-4 w-4" />
                                {t('settings.profile')}
                            </TabsTrigger>
                            <TabsTrigger value="security" className="flex-1 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                                <Shield className="mr-2 h-4 w-4" />
                                {t('settings.security')}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="mt-0">
                            <ProfileSettings user={user} refreshUser={refreshUser} t={t} />
                        </TabsContent>

                        <TabsContent value="security" className="mt-0">
                            <SecuritySettings t={t} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

export function ProfileSettings({ user, refreshUser, t }: { user: any, refreshUser: () => Promise<void>, t: any }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user?.name || '',
            username: user?.username || '',
            phoneNumber: user?.phoneNumber || '',
            countryCode: user?.countryCode || '+51',
        },
    });

    // Update form when user data is loaded
    useEffect(() => {
        if (user) {
            reset({
                name: user.name || '',
                username: user.username || '',
                phoneNumber: user.phoneNumber || '',
                countryCode: user.countryCode || '+51',
            });
        }
    }, [user, reset]);

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
        <Card className="border-none shadow-md">
            <CardHeader>
                <CardTitle>{t('settings.profile')}</CardTitle>
                <CardDescription>{t('settings.updateProfile')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email">{t('settings.email')}</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input id="email" value={user?.email || ''} disabled className="pl-9 bg-muted/50" />
                    </div>
                    <p className="text-xs text-muted-foreground">{t('settings.emailReadOnly')}</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">{t('settings.name')}</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="name"
                            {...register('name')}
                            disabled={isLoading}
                            className="pl-9"
                        />
                    </div>
                    {errors.name && (
                        <p className="text-sm text-destructive">{t(errors.name.message || '')}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="username">Usuario</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="username"
                            {...register('username')}
                            disabled={isLoading}
                            className="pl-9"
                        />
                    </div>
                    {errors.username && (
                        <p className="text-sm text-destructive">{t(errors.username.message || '')}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="countryCode">País</Label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                            <select
                                id="countryCode"
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
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
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Celular</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="phoneNumber"
                                {...register('phoneNumber')}
                                disabled={isLoading}
                                className="pl-9"
                                placeholder="999 999 999"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/30 px-6 py-4">
                <Button onClick={handleSubmit(onSubmit)} disabled={isLoading} className="ml-auto">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t('settings.saveChanges')}
                </Button>
            </CardFooter>
        </Card>
    );
}

export function SecuritySettings({ t }: { t: any }) {
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
        <Card className="border-none shadow-md">
            <CardHeader>
                <CardTitle>{t('settings.security')}</CardTitle>
                <CardDescription>{t('settings.changePassword')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t('settings.currentPassword')}</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="currentPassword"
                            type="password"
                            {...register('currentPassword')}
                            disabled={isLoading}
                            className="pl-9"
                        />
                    </div>
                    {errors.currentPassword && (
                        <p className="text-sm text-destructive">{t(errors.currentPassword.message || '')}</p>
                    )}
                </div>

                <Separator className="my-2" />

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">{t('settings.newPassword')}</Label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="newPassword"
                                type="password"
                                {...register('newPassword')}
                                disabled={isLoading}
                                className="pl-9"
                            />
                        </div>
                        {errors.newPassword && (
                            <p className="text-sm text-destructive">{t(errors.newPassword.message || '')}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t('settings.confirmPassword')}</Label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="confirmPassword"
                                type="password"
                                {...register('confirmPassword')}
                                disabled={isLoading}
                                className="pl-9"
                            />
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-sm text-destructive">{t(errors.confirmPassword.message || '')}</p>
                        )}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/30 px-6 py-4">
                <Button onClick={handleSubmit(onSubmit)} disabled={isLoading} className="ml-auto">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t('settings.changePassword')}
                </Button>
            </CardFooter>
        </Card>
    );
}
