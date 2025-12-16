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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Loader2,
    Save,
    AlertTriangle,
    CheckCircle,
    Smartphone,
    Building2,
    Coins,
    Globe,
    Plus,
    Trash2,
    Palette,
    GripVertical,
    Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tokenManager } from '@/lib/utils/tokenManager';
import { cn } from '@/lib/utils';

interface PaymentMethod {
    id: string;
    name: string;
    type: 'mobile' | 'bank' | 'crypto';
    color: string;
    enabled: boolean;
    phone?: string;
    qrImage?: string;
    walletAddress?: string;
    bankName?: string;
    accountNumber?: string;
    cci?: string;
    holderName?: string;
    instructions?: string;
}

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

const TYPE_ICONS = {
    mobile: Smartphone,
    bank: Building2,
    crypto: Coins,
};

function generateId() {
    return `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default function PaymentConfigPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [userCountryCode, setUserCountryCode] = useState<string>('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

    // New method form state
    const [newMethod, setNewMethod] = useState<Partial<PaymentMethod>>({
        name: '',
        type: 'mobile',
        color: PRESET_COLORS[0],
        enabled: true,
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

    useEffect(() => {
        if (data?.data?.methods) {
            setMethods(data.data.methods);
        }
        if (data?.userCountryCode) {
            setUserCountryCode(data.userCountryCode);
        }
    }, [data]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (methodsData: PaymentMethod[]) => {
            const token = tokenManager.getToken();
            const res = await fetch('/api/payment-validator/payment-config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ methods: methodsData }),
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
        saveMutation.mutate(methods);
    };

    const addMethod = () => {
        if (!newMethod.name) {
            toast({
                title: 'Error',
                description: 'El nombre es requerido',
                variant: 'destructive',
            });
            return;
        }

        const method: PaymentMethod = {
            id: generateId(),
            name: newMethod.name!,
            type: newMethod.type as 'mobile' | 'bank' | 'crypto',
            color: newMethod.color!,
            enabled: true,
            phone: newMethod.phone,
            qrImage: newMethod.qrImage,
            walletAddress: newMethod.walletAddress,
            bankName: newMethod.bankName,
            accountNumber: newMethod.accountNumber,
            cci: newMethod.cci,
            holderName: newMethod.holderName,
            instructions: newMethod.instructions,
        };

        setMethods([...methods, method]);
        setNewMethod({ name: '', type: 'mobile', color: PRESET_COLORS[0], enabled: true });
        setIsAddDialogOpen(false);
        toast({ title: 'Método agregado', description: 'No olvides guardar los cambios.' });
    };

    const updateMethod = (id: string, updates: Partial<PaymentMethod>) => {
        setMethods(methods.map(m => m.id === id ? { ...m, ...updates } : m));
    };

    const deleteMethod = (id: string) => {
        setMethods(methods.filter(m => m.id !== id));
        toast({ title: 'Método eliminado', description: 'No olvides guardar los cambios.' });
    };

    const toggleMethod = (id: string) => {
        setMethods(methods.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
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

    // Check if validator is approved
    const isApproved = data?.approved;
    const status = data?.status || 'pending';

    if (!isApproved) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center mb-6",
                    status === 'pending' && "bg-yellow-100 dark:bg-yellow-900/30",
                    status === 'rejected' && "bg-red-100 dark:bg-red-900/30",
                    status === 'suspended' && "bg-gray-100 dark:bg-gray-900/30"
                )}>
                    {status === 'pending' && <Clock className="h-12 w-12 text-yellow-500" />}
                    {status === 'rejected' && <AlertTriangle className="h-12 w-12 text-red-500" />}
                    {status === 'suspended' && <AlertTriangle className="h-12 w-12 text-gray-500" />}
                </div>

                <h1 className="text-2xl font-bold mb-2">
                    {status === 'pending' && 'Cuenta Pendiente de Aprobación'}
                    {status === 'rejected' && 'Cuenta Rechazada'}
                    {status === 'suspended' && 'Cuenta Suspendida'}
                </h1>

                <p className="text-muted-foreground max-w-md mb-6">
                    {status === 'pending' && 'Tu cuenta de validador de pagos está siendo revisada por el administrador. Una vez aprobada, se te asignará un país y podrás configurar los métodos de pago.'}
                    {status === 'rejected' && 'Tu solicitud fue rechazada. Contacta al administrador para más información.'}
                    {status === 'suspended' && 'Tu cuenta ha sido suspendida temporalmente. Contacta al administrador.'}
                </p>

                <Badge variant="outline" className={cn(
                    "text-base px-4 py-2",
                    status === 'pending' && "border-yellow-500 text-yellow-600",
                    status === 'rejected' && "border-red-500 text-red-600",
                    status === 'suspended' && "border-gray-500 text-gray-600"
                )}>
                    {status === 'pending' && <Clock className="h-4 w-4 mr-2" />}
                    {status === 'rejected' && <AlertTriangle className="h-4 w-4 mr-2" />}
                    {status === 'suspended' && <AlertTriangle className="h-4 w-4 mr-2" />}
                    Estado: {status === 'pending' ? 'Pendiente' : status === 'rejected' ? 'Rechazado' : 'Suspendido'}
                </Badge>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold">{t('paymentConfig.title')}</h1>
                    <p className="text-muted-foreground mt-2">{t('paymentConfig.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-base px-4 py-2">
                        <Globe className="h-4 w-4 mr-2" />
                        {userCountryCode || 'N/A'}
                    </Badge>

                    {/* Add Method Dialog */}
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Método
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Agregar Método de Pago</DialogTitle>
                                <DialogDescription>
                                    Configura un nuevo método de pago para tu país
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                {/* Name */}
                                <div>
                                    <Label>Nombre del Método *</Label>
                                    <Input
                                        className="mt-1"
                                        placeholder="Ej: Yape, SPEI, Nequi..."
                                        value={newMethod.name || ''}
                                        onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                                    />
                                </div>

                                {/* Type */}
                                <div>
                                    <Label>Tipo</Label>
                                    <Select
                                        value={newMethod.type}
                                        onValueChange={(v) => setNewMethod({ ...newMethod, type: v as any })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mobile">📱 Billetera Móvil</SelectItem>
                                            <SelectItem value="bank">🏦 Transferencia Bancaria</SelectItem>
                                            <SelectItem value="crypto">💰 Criptomoneda</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Color */}
                                <div>
                                    <Label className="flex items-center gap-2">
                                        <Palette size={16} />
                                        Color de Fondo
                                    </Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {PRESET_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setNewMethod({ ...newMethod, color })}
                                                className={cn(
                                                    "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                                    newMethod.color === color ? "border-white ring-2 ring-primary" : "border-transparent"
                                                )}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Input
                                            type="text"
                                            placeholder="#RRGGBB"
                                            value={newMethod.color || ''}
                                            onChange={(e) => setNewMethod({ ...newMethod, color: e.target.value })}
                                            className="w-28 font-mono text-sm"
                                        />
                                        <div
                                            className="w-8 h-8 rounded border"
                                            style={{ backgroundColor: newMethod.color }}
                                        />
                                    </div>
                                </div>

                                {/* Type-specific fields */}
                                {(newMethod.type === 'mobile' || newMethod.type === 'crypto') && (
                                    <>
                                        <div>
                                            <Label>{newMethod.type === 'crypto' ? 'Dirección de Wallet' : 'Número de Teléfono'}</Label>
                                            <Input
                                                className="mt-1"
                                                placeholder={newMethod.type === 'crypto' ? 'T...' : '999 888 777'}
                                                value={newMethod.type === 'crypto' ? newMethod.walletAddress || '' : newMethod.phone || ''}
                                                onChange={(e) => setNewMethod({
                                                    ...newMethod,
                                                    [newMethod.type === 'crypto' ? 'walletAddress' : 'phone']: e.target.value
                                                })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Imagen QR</Label>
                                            <div className="mt-2">
                                                <ImageUpload
                                                    value={newMethod.qrImage || ''}
                                                    onChange={(v) => setNewMethod({ ...newMethod, qrImage: v })}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {newMethod.type === 'bank' && (
                                    <>
                                        <div>
                                            <Label>Nombre del Banco</Label>
                                            <Input
                                                className="mt-1"
                                                placeholder="BCP, BBVA, Banamex..."
                                                value={newMethod.bankName || ''}
                                                onChange={(e) => setNewMethod({ ...newMethod, bankName: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Número de Cuenta</Label>
                                            <Input
                                                className="mt-1 font-mono"
                                                placeholder="191-2388123-0-99"
                                                value={newMethod.accountNumber || ''}
                                                onChange={(e) => setNewMethod({ ...newMethod, accountNumber: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>CCI / CLABE</Label>
                                            <Input
                                                className="mt-1 font-mono"
                                                placeholder="002-191-2388123-0-99"
                                                value={newMethod.cci || ''}
                                                onChange={(e) => setNewMethod({ ...newMethod, cci: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Nombre del Titular</Label>
                                            <Input
                                                className="mt-1"
                                                placeholder="Juan Pérez"
                                                value={newMethod.holderName || ''}
                                                onChange={(e) => setNewMethod({ ...newMethod, holderName: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Instructions */}
                                <div>
                                    <Label>Instrucciones (opcional)</Label>
                                    <Input
                                        className="mt-1"
                                        placeholder="Instrucciones adicionales..."
                                        value={newMethod.instructions || ''}
                                        onChange={(e) => setNewMethod({ ...newMethod, instructions: e.target.value })}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={addMethod}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Agregar
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

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

            {!userCountryCode && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{t('paymentConfig.noCountryWarning')}</AlertDescription>
                </Alert>
            )}

            {/* Methods Grid */}
            {methods.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Plus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">No hay métodos de pago</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Agrega tu primer método de pago para que los usuarios puedan recargar saldo.
                        </p>
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Método
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {methods.map((method) => {
                        const Icon = TYPE_ICONS[method.type];
                        return (
                            <Card
                                key={method.id}
                                className={cn(
                                    "relative transition-all",
                                    !method.enabled && "opacity-60"
                                )}
                                style={{ borderColor: method.enabled ? method.color : undefined }}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                                                style={{ backgroundColor: method.color }}
                                            >
                                                <Icon size={20} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{method.name}</CardTitle>
                                                <CardDescription>
                                                    {method.type === 'mobile' && 'Billetera Móvil'}
                                                    {method.type === 'bank' && 'Banco'}
                                                    {method.type === 'crypto' && 'Crypto'}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={method.enabled}
                                            onCheckedChange={() => toggleMethod(method.id)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Phone/Wallet */}
                                    {(method.type === 'mobile' && method.phone) && (
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Tel: </span>
                                            <span className="font-mono">{method.phone}</span>
                                        </div>
                                    )}
                                    {(method.type === 'crypto' && method.walletAddress) && (
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Wallet: </span>
                                            <span className="font-mono text-xs break-all">{method.walletAddress}</span>
                                        </div>
                                    )}

                                    {/* Bank details */}
                                    {method.type === 'bank' && (
                                        <div className="text-sm space-y-1">
                                            {method.bankName && (
                                                <div><span className="text-muted-foreground">Banco: </span>{method.bankName}</div>
                                            )}
                                            {method.accountNumber && (
                                                <div><span className="text-muted-foreground">Cuenta: </span><span className="font-mono">{method.accountNumber}</span></div>
                                            )}
                                            {method.holderName && (
                                                <div><span className="text-muted-foreground">Titular: </span>{method.holderName}</div>
                                            )}
                                        </div>
                                    )}

                                    {/* QR Preview */}
                                    {method.qrImage && (
                                        <div className="flex justify-center">
                                            <img
                                                src={method.qrImage}
                                                alt={`QR ${method.name}`}
                                                className="w-24 h-24 rounded-lg object-contain bg-white"
                                            />
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex justify-end pt-2 border-t">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => deleteMethod(method.id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Eliminar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Info */}
            <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{t('paymentConfig.info')}</AlertDescription>
            </Alert>
        </div>
    );
}
