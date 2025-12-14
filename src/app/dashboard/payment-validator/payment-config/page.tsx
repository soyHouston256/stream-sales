'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/shared/ImageUpload';
import {
    Loader2,
    Save,
    AlertTriangle,
    CheckCircle,
    Smartphone,
    Building2,
    Coins,
    Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tokenManager } from '@/lib/utils/tokenManager';

interface PaymentConfig {
    countryCode: string;
    yapeEnabled: boolean;
    yapePhone: string | null;
    yapeQrUrl: string | null;
    plinEnabled: boolean;
    plinPhone: string | null;
    plinQrUrl: string | null;
    binanceEnabled: boolean;
    binanceWallet: string | null;
    binanceQrUrl: string | null;
    bankEnabled: boolean;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankCci: string | null;
    bankHolderName: string | null;
}

export default function PaymentConfigPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [config, setConfig] = useState<PaymentConfig>({
        countryCode: '',
        yapeEnabled: false,
        yapePhone: '',
        yapeQrUrl: '',
        plinEnabled: false,
        plinPhone: '',
        plinQrUrl: '',
        binanceEnabled: false,
        binanceWallet: '',
        binanceQrUrl: '',
        bankEnabled: false,
        bankName: '',
        bankAccountNumber: '',
        bankCci: '',
        bankHolderName: '',
    });

    // Fetch current config
    const { data, isLoading, error } = useQuery({
        queryKey: ['payment-config'],
        queryFn: async () => {
            const token = tokenManager.getToken();
            const res = await fetch('/api/payment-validator/payment-config', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch config');
            return res.json();
        },
    });

    // Update config when data loads
    useEffect(() => {
        if (data?.data) {
            setConfig({
                countryCode: data.userCountryCode || data.data.countryCode || '',
                yapeEnabled: data.data.yapeEnabled || false,
                yapePhone: data.data.yapePhone || '',
                yapeQrUrl: data.data.yapeQrUrl || '',
                plinEnabled: data.data.plinEnabled || false,
                plinPhone: data.data.plinPhone || '',
                plinQrUrl: data.data.plinQrUrl || '',
                binanceEnabled: data.data.binanceEnabled || false,
                binanceWallet: data.data.binanceWallet || '',
                binanceQrUrl: data.data.binanceQrUrl || '',
                bankEnabled: data.data.bankEnabled || false,
                bankName: data.data.bankName || '',
                bankAccountNumber: data.data.bankAccountNumber || '',
                bankCci: data.data.bankCci || '',
                bankHolderName: data.data.bankHolderName || '',
            });
        }
    }, [data]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (configData: Partial<PaymentConfig>) => {
            const token = tokenManager.getToken();
            const res = await fetch('/api/payment-validator/payment-config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(configData),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-config'] });
            toast({
                title: t('paymentConfig.saveSuccess'),
                description: t('paymentConfig.saveSuccessDesc'),
            });
        },
        onError: (error: Error) => {
            toast({
                title: t('paymentConfig.saveError'),
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const handleSave = () => {
        const { countryCode, ...configToSave } = config;
        saveMutation.mutate(configToSave);
    };

    const updateField = (field: keyof PaymentConfig, value: string | boolean | null) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid gap-6 md:grid-cols-2">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-64 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t('paymentConfig.loadError')}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t('paymentConfig.title')}</h1>
                    <p className="text-muted-foreground mt-2">{t('paymentConfig.subtitle')}</p>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-base px-4 py-2">
                        <Globe className="h-4 w-4 mr-2" />
                        {config.countryCode || 'N/A'}
                    </Badge>
                    <Button onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {t('paymentConfig.save')}
                    </Button>
                </div>
            </div>

            {!config.countryCode && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{t('paymentConfig.noCountryWarning')}</AlertDescription>
                </Alert>
            )}

            {/* Payment Methods Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* YAPE */}
                <Card className={config.yapeEnabled ? 'border-purple-500' : ''}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                                    Y
                                </div>
                                <div>
                                    <CardTitle>Yape</CardTitle>
                                    <CardDescription>{t('paymentConfig.mobilePayment')}</CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={config.yapeEnabled}
                                onCheckedChange={(v) => updateField('yapeEnabled', v)}
                            />
                        </div>
                    </CardHeader>
                    {config.yapeEnabled && (
                        <CardContent className="space-y-4">
                            <div>
                                <Label>{t('paymentConfig.phoneNumber')}</Label>
                                <div className="relative mt-1">
                                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <Input
                                        className="pl-10"
                                        placeholder="999 888 777"
                                        value={config.yapePhone || ''}
                                        onChange={(e) => updateField('yapePhone', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('paymentConfig.qrImage')}</Label>
                                <div className="mt-2">
                                    <ImageUpload
                                        value={config.yapeQrUrl || ''}
                                        onChange={(v) => updateField('yapeQrUrl', v)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* PLIN */}
                <Card className={config.plinEnabled ? 'border-sky-500' : ''}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold">
                                    P
                                </div>
                                <div>
                                    <CardTitle>Plin</CardTitle>
                                    <CardDescription>{t('paymentConfig.mobilePayment')}</CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={config.plinEnabled}
                                onCheckedChange={(v) => updateField('plinEnabled', v)}
                            />
                        </div>
                    </CardHeader>
                    {config.plinEnabled && (
                        <CardContent className="space-y-4">
                            <div>
                                <Label>{t('paymentConfig.phoneNumber')}</Label>
                                <div className="relative mt-1">
                                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <Input
                                        className="pl-10"
                                        placeholder="999 888 777"
                                        value={config.plinPhone || ''}
                                        onChange={(e) => updateField('plinPhone', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('paymentConfig.qrImage')}</Label>
                                <div className="mt-2">
                                    <ImageUpload
                                        value={config.plinQrUrl || ''}
                                        onChange={(v) => updateField('plinQrUrl', v)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* BINANCE */}
                <Card className={config.binanceEnabled ? 'border-yellow-500' : ''}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">
                                    <Coins size={20} />
                                </div>
                                <div>
                                    <CardTitle>Binance</CardTitle>
                                    <CardDescription>{t('paymentConfig.cryptoPayment')}</CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={config.binanceEnabled}
                                onCheckedChange={(v) => updateField('binanceEnabled', v)}
                            />
                        </div>
                    </CardHeader>
                    {config.binanceEnabled && (
                        <CardContent className="space-y-4">
                            <div>
                                <Label>{t('paymentConfig.walletAddress')} (TRC20)</Label>
                                <Input
                                    className="font-mono mt-1"
                                    placeholder="T..."
                                    value={config.binanceWallet || ''}
                                    onChange={(e) => updateField('binanceWallet', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>{t('paymentConfig.qrImage')}</Label>
                                <div className="mt-2">
                                    <ImageUpload
                                        value={config.binanceQrUrl || ''}
                                        onChange={(v) => updateField('binanceQrUrl', v)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* BANK */}
                <Card className={config.bankEnabled ? 'border-gray-500' : ''}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <CardTitle>{t('paymentConfig.bankTransfer')}</CardTitle>
                                    <CardDescription>{t('paymentConfig.bankTransferDesc')}</CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={config.bankEnabled}
                                onCheckedChange={(v) => updateField('bankEnabled', v)}
                            />
                        </div>
                    </CardHeader>
                    {config.bankEnabled && (
                        <CardContent className="space-y-4">
                            <div>
                                <Label>{t('paymentConfig.bankName')}</Label>
                                <Input
                                    className="mt-1"
                                    placeholder="BCP, BBVA, etc."
                                    value={config.bankName || ''}
                                    onChange={(e) => updateField('bankName', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>{t('paymentConfig.accountNumber')}</Label>
                                <Input
                                    className="font-mono mt-1"
                                    placeholder="191-2388123-0-99"
                                    value={config.bankAccountNumber || ''}
                                    onChange={(e) => updateField('bankAccountNumber', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>{t('paymentConfig.cci')}</Label>
                                <Input
                                    className="font-mono mt-1"
                                    placeholder="002-191-2388123-0-99"
                                    value={config.bankCci || ''}
                                    onChange={(e) => updateField('bankCci', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>{t('paymentConfig.holderName')}</Label>
                                <Input
                                    className="mt-1"
                                    placeholder="Nombre del titular"
                                    value={config.bankHolderName || ''}
                                    onChange={(e) => updateField('bankHolderName', e.target.value)}
                                />
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>

            {/* Info */}
            <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{t('paymentConfig.info')}</AlertDescription>
            </Alert>
        </div>
    );
}
