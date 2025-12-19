'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    DollarSign,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Globe,
    AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tokenManager } from '@/lib/utils/tokenManager';

interface ExchangeRate {
    id: string;
    countryCode: string;
    countryName: string;
    currencyCode: string;
    currencyName: string;
    rate: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface FormData {
    countryCode: string;
    countryName: string;
    currencyCode: string;
    currencyName: string;
    rate: string;
    isActive: boolean;
}

const initialFormData: FormData = {
    countryCode: '',
    countryName: '',
    currencyCode: '',
    currencyName: '',
    rate: '',
    isActive: true,
};

// Common country presets
const countryPresets = [
    { code: 'PE', name: 'Perú', currency: 'PEN', currencyName: 'Nuevo Sol' },
    { code: 'MX', name: 'México', currency: 'MXN', currencyName: 'Peso Mexicano' },
    { code: 'CO', name: 'Colombia', currency: 'COP', currencyName: 'Peso Colombiano' },
    { code: 'AR', name: 'Argentina', currency: 'ARS', currencyName: 'Peso Argentino' },
    { code: 'CL', name: 'Chile', currency: 'CLP', currencyName: 'Peso Chileno' },
    { code: 'EC', name: 'Ecuador', currency: 'USD', currencyName: 'Dólar' },
    { code: 'BR', name: 'Brasil', currency: 'BRL', currencyName: 'Real' },
];

export function ExchangeRateConfig() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showDialog, setShowDialog] = useState(false);
    const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);

    // Fetch exchange rates
    const { data, isLoading, error } = useQuery<{ data: ExchangeRate[] }>({
        queryKey: ['exchange-rates'],
        queryFn: async () => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/admin/settings/exchange-rates', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch exchange rates');
            return response.json();
        },
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/admin/settings/exchange-rates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...data,
                    rate: parseFloat(data.rate),
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
            toast({ title: 'Éxito', description: 'Tipo de cambio creado correctamente' });
            closeDialog();
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/admin/settings/exchange-rates', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    id,
                    ...data,
                    rate: parseFloat(data.rate),
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
            toast({ title: 'Éxito', description: 'Tipo de cambio actualizado correctamente' });
            closeDialog();
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/admin/settings/exchange-rates', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ id }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
            toast({ title: 'Éxito', description: 'Tipo de cambio eliminado' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    const openCreateDialog = () => {
        setEditingRate(null);
        setFormData(initialFormData);
        setShowDialog(true);
    };

    const openEditDialog = (rate: ExchangeRate) => {
        setEditingRate(rate);
        setFormData({
            countryCode: rate.countryCode,
            countryName: rate.countryName,
            currencyCode: rate.currencyCode,
            currencyName: rate.currencyName,
            rate: rate.rate,
            isActive: rate.isActive,
        });
        setShowDialog(true);
    };

    const closeDialog = () => {
        setShowDialog(false);
        setEditingRate(null);
        setFormData(initialFormData);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingRate) {
            updateMutation.mutate({ id: editingRate.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const applyPreset = (preset: typeof countryPresets[0]) => {
        setFormData({
            ...formData,
            countryCode: preset.code,
            countryName: preset.name,
            currencyCode: preset.currency,
            currencyName: preset.currencyName,
        });
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        <CardTitle>Tipos de Cambio por País</CardTitle>
                    </div>
                    <Button onClick={openCreateDialog} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar País
                    </Button>
                </div>
                <CardDescription>
                    Configura el tipo de cambio de USD a la moneda local de cada país.
                    Esto se usará para mostrar precios en moneda local.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
                        <AlertCircle className="h-5 w-5" />
                        <span>Error al cargar los tipos de cambio</span>
                    </div>
                ) : data?.data.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay tipos de cambio configurados</p>
                        <p className="text-sm">Agrega el primer país para comenzar</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>País</TableHead>
                                <TableHead>Moneda</TableHead>
                                <TableHead className="text-right">Tipo de Cambio</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.data.map((rate) => (
                                <TableRow key={rate.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{getCountryFlag(rate.countryCode)}</span>
                                            <div>
                                                <p className="font-medium">{rate.countryName}</p>
                                                <p className="text-xs text-muted-foreground">{rate.countryCode}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{rate.currencyCode}</p>
                                            <p className="text-xs text-muted-foreground">{rate.currencyName}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-muted-foreground">1 USD =</span>
                                            <span className="font-bold text-lg">{parseFloat(rate.rate).toFixed(2)}</span>
                                            <span className="text-muted-foreground">{rate.currencyCode}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={rate.isActive ? 'default' : 'secondary'}>
                                            {rate.isActive ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(rate)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    if (confirm('¿Eliminar este tipo de cambio?')) {
                                                        deleteMutation.mutate(rate.id);
                                                    }
                                                }}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {/* Create/Edit Dialog */}
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingRate ? 'Editar Tipo de Cambio' : 'Agregar Tipo de Cambio'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingRate
                                    ? 'Actualiza la información del tipo de cambio'
                                    : 'Configura el tipo de cambio para un nuevo país'}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Quick presets for new entries */}
                            {!editingRate && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">Selección rápida</Label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {countryPresets.map((preset) => (
                                            <Button
                                                key={preset.code}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => applyPreset(preset)}
                                                className="text-xs"
                                            >
                                                {getCountryFlag(preset.code)} {preset.code}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="countryCode">Código País</Label>
                                    <Input
                                        id="countryCode"
                                        value={formData.countryCode}
                                        onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                                        placeholder="PE"
                                        maxLength={2}
                                        required
                                        disabled={!!editingRate}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="countryName">Nombre del País</Label>
                                    <Input
                                        id="countryName"
                                        value={formData.countryName}
                                        onChange={(e) => setFormData({ ...formData, countryName: e.target.value })}
                                        placeholder="Perú"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="currencyCode">Código Moneda</Label>
                                    <Input
                                        id="currencyCode"
                                        value={formData.currencyCode}
                                        onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value.toUpperCase() })}
                                        placeholder="PEN"
                                        maxLength={3}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="currencyName">Nombre Moneda</Label>
                                    <Input
                                        id="currencyName"
                                        value={formData.currencyName}
                                        onChange={(e) => setFormData({ ...formData, currencyName: e.target.value })}
                                        placeholder="Nuevo Sol"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="rate">Tipo de Cambio (1 USD = ?)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="rate"
                                        type="number"
                                        step="0.0001"
                                        min="0.0001"
                                        value={formData.rate}
                                        onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                                        placeholder="3.75"
                                        className="pl-9"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Ejemplo: 1 USD = 3.75 PEN
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="isActive">Estado activo</Label>
                                <Switch
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeDialog}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : editingRate ? (
                                        'Actualizar'
                                    ) : (
                                        'Crear'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}

// Helper function to get country flag emoji
function getCountryFlag(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
