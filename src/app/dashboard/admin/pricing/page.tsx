'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/lib/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, DollarSign, TrendingUp, Percent } from 'lucide-react';
import { tokenManager } from '@/lib/utils/tokenManager';
import { useLanguage } from '@/contexts/LanguageContext';

const pricingSchema = z.object({
    distributorMarkup: z.number().min(0),
    distributorMarkupType: z.enum(['percentage', 'fixed']),
    platformFee: z.number().min(0),
    platformFeeType: z.enum(['percentage', 'fixed']),
});

type PricingFormData = z.infer<typeof pricingSchema>;

export default function PricingPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: config, isLoading: configLoading } = useQuery({
        queryKey: ['pricing-config'],
        queryFn: async () => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/admin/pricing', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch pricing config');
            return response.json();
        },
    });

    const updateConfig = useMutation({
        mutationFn: async (data: PricingFormData) => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/admin/pricing', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to update');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pricing-config'] });
        },
    });

    const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<PricingFormData>({
        resolver: zodResolver(pricingSchema),
        defaultValues: {
            distributorMarkup: 15,
            distributorMarkupType: 'percentage',
            platformFee: 10,
            platformFeeType: 'percentage',
        },
    });

    // Update form values when config loads
    useEffect(() => {
        if (config) {
            setValue('distributorMarkup', config.distributorMarkup);
            setValue('distributorMarkupType', config.distributorMarkupType);
            setValue('platformFee', config.platformFee);
            setValue('platformFeeType', config.platformFeeType);
        }
    }, [config, setValue]);

    const markupType = watch('distributorMarkupType') || 'percentage';
    const feeType = watch('platformFeeType') || 'percentage';
    const markupValue = watch('distributorMarkup') || 15;
    const feeValue = watch('platformFee') || 10;

    const onSubmit = async (data: PricingFormData) => {
        try {
            await updateConfig.mutateAsync(data);
            toast({
                title: t('pricing.successUpdate'),
                description: t('pricing.successUpdateDesc'),
            });
        } catch (error) {
            toast({
                title: t('pricing.errorUpdate'),
                description: t('pricing.errorUpdateDesc'),
                variant: 'destructive',
            });
        }
    };

    // Calculator
    const basePrice = 100;
    const markupAmount = markupType === 'percentage' ? basePrice * (markupValue / 100) : markupValue;
    const marketPrice = basePrice + markupAmount;
    const feeAmount = feeType === 'percentage' ? basePrice * (feeValue / 100) : feeValue;
    const providerReceives = basePrice - feeAmount;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">{t('pricing.title')}</h1>
                <p className="text-muted-foreground mt-2">
                    {t('pricing.subtitle')}
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            <CardTitle>{t('pricing.currentConfig')}</CardTitle>
                        </div>
                        <CardDescription>
                            {t('pricing.currentConfigDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {configLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="space-y-2">
                                    <Label>{t('pricing.distributorMarkup')}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder={markupType === 'percentage' ? '0-100' : '0+'}
                                            {...register('distributorMarkup', { valueAsNumber: true })}
                                            className="flex-1"
                                        />
                                        <Select
                                            value={markupType}
                                            onValueChange={(value) => setValue('distributorMarkupType', value as 'percentage' | 'fixed')}
                                        >
                                            <SelectTrigger className="w-24">
                                                <SelectValue placeholder="%" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">{t('pricing.percentage')}</SelectItem>
                                                <SelectItem value="fixed">{t('pricing.fixed')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {errors.distributorMarkup && (
                                        <p className="text-sm text-destructive">{errors.distributorMarkup.message}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {markupType === 'percentage'
                                            ? t('pricing.markupPercentDesc')
                                            : t('pricing.markupDesc')}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('pricing.platformFee')}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder={feeType === 'percentage' ? '0-100' : '0+'}
                                            {...register('platformFee', { valueAsNumber: true })}
                                            className="flex-1"
                                        />
                                        <Select
                                            value={feeType}
                                            onValueChange={(value) => setValue('platformFeeType', value as 'percentage' | 'fixed')}
                                        >
                                            <SelectTrigger className="w-24">
                                                <SelectValue placeholder="%" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">{t('pricing.percentage')}</SelectItem>
                                                <SelectItem value="fixed">{t('pricing.fixed')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {errors.platformFee && (
                                        <p className="text-sm text-destructive">{errors.platformFee.message}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {feeType === 'percentage'
                                            ? t('pricing.feePercentDesc')
                                            : t('pricing.feeDesc')}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <Button type="submit" disabled={updateConfig.isPending} className="flex-1">
                                        {updateConfig.isPending ? t('pricing.saving') : t('pricing.saveChanges')}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => reset()}>
                                        {t('pricing.reset')}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('pricing.currentValues')}</CardTitle>
                            <CardDescription>{t('pricing.currentValuesDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {configLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-16 w-full" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 border rounded-lg">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                            <TrendingUp className="h-4 w-4" />
                                            {t('pricing.distributorMarkup')}
                                        </div>
                                        <div className="text-3xl font-bold">
                                            {config?.distributorMarkupType === 'percentage' && <Percent className="inline h-6 w-6 mr-1" />}
                                            {config?.distributorMarkupType === 'fixed' && <span className="text-xl mr-1">$</span>}
                                            {config?.distributorMarkup}
                                            {config?.distributorMarkupType === 'percentage' && '%'}
                                        </div>
                                    </div>
                                    <div className="p-4 border rounded lg">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                            <DollarSign className="h-4 w-4" />
                                            {t('pricing.platformFee')}
                                        </div>
                                        <div className="text-3xl font-bold">
                                            {config?.platformFeeType === 'percentage' && <Percent className="inline h-6 w-6 mr-1" />}
                                            {config?.platformFeeType === 'fixed' && <span className="text-xl mr-1">$</span>}
                                            {config?.platformFee}
                                            {config?.platformFeeType === 'percentage' && '%'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                        <CardHeader>
                            <CardTitle className="text-base">{t('pricing.example')}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('pricing.basePrice')}:</span>
                                <span className="font-medium">$100.00</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    + {t('pricing.markup')} ({markupType === 'percentage' ? `${markupValue}%` : `$${markupValue}`}):
                                </span>
                                <span className="font-medium">+${markupAmount.toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-bold">
                                <span>{t('pricing.marketPrice')}:</span>
                                <span className="text-green-600">${marketPrice.toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-2 mt-2" />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    - {t('pricing.feePlatform')} ({feeType === 'percentage' ? `${feeValue}%` : `$${feeValue}`}):
                                </span>
                                <span className="font-medium text-red-600">-${feeAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>{t('pricing.providerReceives')}:</span>
                                <span className="text-blue-600">${providerReceives.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
