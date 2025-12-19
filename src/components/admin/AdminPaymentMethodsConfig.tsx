'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/shared/ImageUpload';
import {
    CreditCard, Plus, Trash2, Edit, Smartphone, Building2, Coins,
    Loader2, AlertTriangle, Palette
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tokenManager } from '@/lib/utils/tokenManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface AdminPaymentMethod {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    color: string;
    phone?: string;
    qrImage?: string;
    bankName?: string;
    accountNumber?: string;
    cci?: string;
    holderName?: string;
    walletAddress?: string;
    network?: string;
    instructions?: string;
}

const TYPE_OPTIONS = [
    { value: 'mobile', label: 'Billetera Móvil', icon: Smartphone },
    { value: 'bank', label: 'Transferencia Bancaria', icon: Building2 },
    { value: 'crypto', label: 'Criptomoneda', icon: Coins },
];

const PRESET_COLORS = [
    '#8B5CF6', // Purple (Yape-like)
    '#0EA5E9', // Sky blue (Plin-like)
    '#F59E0B', // Yellow (Binance-like)
    '#10B981', // Green
    '#EF4444', // Red
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#64748B', // Slate
];

const emptyForm = {
    name: '',
    type: 'mobile',
    enabled: true,
    color: '#8B5CF6',
    phone: '',
    qrImage: '',
    bankName: '',
    accountNumber: '',
    cci: '',
    holderName: '',
    walletAddress: '',
    network: '',
    instructions: '',
};

export function AdminPaymentMethodsConfig() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [showDialog, setShowDialog] = useState(false);
    const [editingMethod, setEditingMethod] = useState<AdminPaymentMethod | null>(null);
    const [form, setForm] = useState(emptyForm);

    // Fetch methods
    const { data, isLoading } = useQuery({
        queryKey: ['admin-payment-methods'],
        queryFn: async () => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/admin/settings/admin-payment-methods', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch payment methods');
            return response.json();
        },
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: typeof emptyForm) => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/admin/settings/admin-payment-methods', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create method');
            }
            return response.json();
        },
        onSuccess: () => {
            toast({ title: t('admin.paymentMethods.created'), description: t('admin.paymentMethods.createdDesc') });
            queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
            closeDialog();
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: typeof emptyForm }) => {
            const token = tokenManager.getToken();
            const response = await fetch(`/api/admin/settings/admin-payment-methods/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update method');
            }
            return response.json();
        },
        onSuccess: () => {
            toast({ title: t('admin.paymentMethods.updated'), description: t('admin.paymentMethods.updatedDesc') });
            queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
            closeDialog();
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const token = tokenManager.getToken();
            const response = await fetch(`/api/admin/settings/admin-payment-methods/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete method');
            }
            return response.json();
        },
        onSuccess: () => {
            toast({ title: t('admin.paymentMethods.deleted'), description: t('admin.paymentMethods.deletedDesc') });
            queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
        },
        onError: (error: Error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    const closeDialog = () => {
        setShowDialog(false);
        setEditingMethod(null);
        setForm(emptyForm);
    };

    const openCreate = () => {
        setEditingMethod(null);
        setForm(emptyForm);
        setShowDialog(true);
    };

    const openEdit = (method: AdminPaymentMethod) => {
        setEditingMethod(method);
        setForm({
            name: method.name,
            type: method.type,
            enabled: method.enabled,
            color: method.color,
            phone: method.phone || '',
            qrImage: method.qrImage || '',
            bankName: method.bankName || '',
            accountNumber: method.accountNumber || '',
            cci: method.cci || '',
            holderName: method.holderName || '',
            walletAddress: method.walletAddress || '',
            network: method.network || '',
            instructions: method.instructions || '',
        });
        setShowDialog(true);
    };

    const handleSubmit = () => {
        if (!form.name) {
            toast({ title: 'Error', description: t('admin.paymentMethods.nameRequired'), variant: 'destructive' });
            return;
        }

        if (editingMethod) {
            updateMutation.mutate({ id: editingMethod.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const getTypeIcon = (type: string) => {
        const option = TYPE_OPTIONS.find(o => o.value === type);
        if (!option) return null;
        const Icon = option.icon;
        return <Icon size={16} />;
    };

    const methods: AdminPaymentMethod[] = data?.data || [];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <CardTitle>{t('admin.paymentMethods.title')}</CardTitle>
                    </div>
                    <Button onClick={openCreate} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('admin.paymentMethods.add')}
                    </Button>
                </div>
                <CardDescription>{t('admin.paymentMethods.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : methods.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>{t('admin.paymentMethods.noMethods')}</p>
                        <p className="text-sm">{t('admin.paymentMethods.noMethodsDesc')}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {methods.map((method) => (
                            <div
                                key={method.id}
                                className="flex items-center justify-between p-4 rounded-lg border"
                                style={{ borderLeftWidth: 4, borderLeftColor: method.color }}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                                        style={{ backgroundColor: method.color }}
                                    >
                                        {getTypeIcon(method.type)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{method.name}</span>
                                            {!method.enabled && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {t('admin.paymentMethods.disabled')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {method.type === 'mobile' && method.phone && `📱 ${method.phone}`}
                                            {method.type === 'bank' && method.bankName && `🏦 ${method.bankName}`}
                                            {method.type === 'crypto' && method.network && `🪙 ${method.network}`}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(method)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteMutation.mutate(method.id)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create/Edit Dialog */}
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingMethod ? t('admin.paymentMethods.edit') : t('admin.paymentMethods.add')}
                            </DialogTitle>
                            <DialogDescription>
                                {t('admin.paymentMethods.formDesc')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>{t('admin.paymentMethods.name')} *</Label>
                                    <Input
                                        placeholder="ej: Yape Principal"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>{t('admin.paymentMethods.type')}</Label>
                                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TYPE_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2">
                                    <Label className="flex items-center gap-2">
                                        <Palette size={16} />
                                        {t('admin.paymentMethods.color')}
                                    </Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {PRESET_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setForm({ ...form, color })}
                                                className={cn(
                                                    "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                                    form.color === color ? "border-white ring-2 ring-primary" : "border-transparent"
                                                )}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Input
                                            type="text"
                                            placeholder="#RRGGBB"
                                            value={form.color}
                                            onChange={(e) => setForm({ ...form, color: e.target.value })}
                                            className="w-28 font-mono text-sm"
                                        />
                                        <div
                                            className="w-8 h-8 rounded border"
                                            style={{ backgroundColor: form.color }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Enabled Switch */}
                            <div className="flex items-center justify-between">
                                <Label>{t('admin.paymentMethods.enabled')}</Label>
                                <Switch
                                    checked={form.enabled}
                                    onCheckedChange={(v) => setForm({ ...form, enabled: v })}
                                />
                            </div>

                            {/* Type-specific fields */}
                            {form.type === 'mobile' && (
                                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                                    <h4 className="font-medium text-sm">{t('admin.paymentMethods.mobileDetails')}</h4>
                                    <div>
                                        <Label>{t('admin.paymentMethods.phone')}</Label>
                                        <Input
                                            placeholder="999 888 777"
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>{t('admin.paymentMethods.qrImage')}</Label>
                                        <div className="mt-2">
                                            <ImageUpload
                                                value={form.qrImage}
                                                onChange={(v) => setForm({ ...form, qrImage: v })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>{t('admin.paymentMethods.holderName')}</Label>
                                        <Input
                                            placeholder="Nombre del titular"
                                            value={form.holderName}
                                            onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {form.type === 'bank' && (
                                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                                    <h4 className="font-medium text-sm">{t('admin.paymentMethods.bankDetails')}</h4>
                                    <div>
                                        <Label>{t('admin.paymentMethods.bankName')}</Label>
                                        <Input
                                            placeholder="BCP, Interbank, etc."
                                            value={form.bankName}
                                            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>{t('admin.paymentMethods.accountNumber')}</Label>
                                        <Input
                                            placeholder="Número de cuenta"
                                            value={form.accountNumber}
                                            onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>{t('admin.paymentMethods.cci')}</Label>
                                        <Input
                                            placeholder="CCI / CLABE"
                                            value={form.cci}
                                            onChange={(e) => setForm({ ...form, cci: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>{t('admin.paymentMethods.holderName')}</Label>
                                        <Input
                                            placeholder="Nombre del titular"
                                            value={form.holderName}
                                            onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {form.type === 'crypto' && (
                                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                                    <h4 className="font-medium text-sm">{t('admin.paymentMethods.cryptoDetails')}</h4>
                                    <div>
                                        <Label>{t('admin.paymentMethods.walletAddress')}</Label>
                                        <Input
                                            placeholder="0x..."
                                            value={form.walletAddress}
                                            onChange={(e) => setForm({ ...form, walletAddress: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>{t('admin.paymentMethods.network')}</Label>
                                        <Input
                                            placeholder="TRC20, BEP20, etc."
                                            value={form.network}
                                            onChange={(e) => setForm({ ...form, network: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>{t('admin.paymentMethods.qrImage')}</Label>
                                        <div className="mt-2">
                                            <ImageUpload
                                                value={form.qrImage}
                                                onChange={(v) => setForm({ ...form, qrImage: v })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Instructions */}
                            <div>
                                <Label>{t('admin.paymentMethods.instructions')}</Label>
                                <Textarea
                                    placeholder={t('admin.paymentMethods.instructionsPlaceholder')}
                                    value={form.instructions}
                                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                                    rows={2}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={closeDialog}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {(createMutation.isPending || updateMutation.isPending) ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.processing')}</>
                                ) : (
                                    editingMethod ? t('common.save') : t('admin.paymentMethods.add')
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
