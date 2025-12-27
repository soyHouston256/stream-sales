'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { tokenManager } from '@/lib/utils/tokenManager';
import { Package, Mail, User, CheckCircle, XCircle, Clock, Trash2, AlertTriangle } from 'lucide-react';

interface InventorySlot {
    id: string;
    profileName: string;
    status: 'available' | 'sold' | 'reserved';
}

interface InventoryAccount {
    id: string;
    email: string;
    totalSlots: number;
    availableSlots: number;
    platformType: string;
    expiryDate: string | null;
    slots: InventorySlot[];
}

interface InventoryData {
    productId: string;
    productName: string;
    stockTotal: number;
    stockAvailable: number;
    accounts: InventoryAccount[];
}

interface InventoryDetailsDialogProps {
    productId: string | null;
    productName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function InventoryDetailsDialog({
    productId,
    productName,
    isOpen,
    onClose,
}: InventoryDetailsDialogProps) {
    const { t } = useLanguage();
    const [data, setData] = useState<InventoryData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && productId) {
            fetchInventory();
        }
    }, [isOpen, productId]);

    const fetchInventory = async () => {
        if (!productId) return;

        setIsLoading(true);
        setError(null);

        try {
            const token = tokenManager.getToken();
            const response = await fetch(`/api/provider/products/${productId}/inventory`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch inventory');
            }

            const inventoryData = await response.json();
            setData(inventoryData);
        } catch (err) {
            setError('Error loading inventory details');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async (accountId: string) => {
        setDeletingAccountId(accountId);

        try {
            const token = tokenManager.getToken();
            const response = await fetch(`/api/provider/inventory/${accountId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete account');
            }

            // Refresh inventory after deletion
            await fetchInventory();
            setConfirmDeleteId(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeletingAccountId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available':
                return (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('provider.inventory.available') || 'Disponible'}
                    </Badge>
                );
            case 'sold':
                return (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-none">
                        <XCircle className="h-3 w-3 mr-1" />
                        {t('provider.inventory.sold') || 'Vendido'}
                    </Badge>
                );
            case 'reserved':
                return (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none">
                        <Clock className="h-3 w-3 mr-1" />
                        {t('provider.inventory.reserved') || 'Reservado'}
                    </Badge>
                );
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const getAccountStatus = (account: InventoryAccount) => {
        if (account.availableSlots === 0) return 'sold';
        if (account.availableSlots < account.totalSlots) return 'partial';
        return 'available';
    };

    const canDeleteAccount = (account: InventoryAccount) => {
        // Can only delete if all slots are available (none sold)
        return account.availableSlots === account.totalSlots;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-indigo-500" />
                        {t('provider.inventory.title') || 'Detalle de Inventario'}
                    </DialogTitle>
                    <DialogDescription>
                        {productName}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-24 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-8">{error}</div>
                    ) : data && data.accounts.length > 0 ? (
                        <>
                            {/* Summary */}
                            <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        {t('provider.inventory.totalAccounts') || 'Total de Cuentas'}
                                    </p>
                                    <p className="text-2xl font-bold">{data.accounts.length}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">
                                        {t('provider.inventory.slotsAvailable') || 'Slots Disponibles'}
                                    </p>
                                    <p className="text-2xl font-bold text-emerald-600">
                                        {data.stockAvailable}/{data.stockTotal}
                                    </p>
                                </div>
                            </div>

                            {/* Accounts List */}
                            <div className="space-y-3">
                                {data.accounts.map((account, index) => {
                                    const accountStatus = getAccountStatus(account);
                                    const isDeletable = canDeleteAccount(account);
                                    const isConfirming = confirmDeleteId === account.id;
                                    const isDeleting = deletingAccountId === account.id;

                                    return (
                                        <div
                                            key={account.id}
                                            className={`rounded-xl border p-4 transition-colors ${accountStatus === 'sold'
                                                ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                                : accountStatus === 'partial'
                                                    ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                                                    : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${accountStatus === 'sold' ? 'bg-red-500' :
                                                        accountStatus === 'partial' ? 'bg-amber-500' : 'bg-emerald-500'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5 text-sm font-medium">
                                                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span className="font-mono text-xs">{account.email}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className={
                                                        accountStatus === 'sold' ? 'border-red-300 text-red-600' :
                                                            accountStatus === 'partial' ? 'border-amber-300 text-amber-600' :
                                                                'border-emerald-300 text-emerald-600'
                                                    }>
                                                        {account.availableSlots}/{account.totalSlots} {t('provider.inventory.available') || 'disponibles'}
                                                    </Badge>

                                                    {/* Delete Button */}
                                                    {isDeletable && !isConfirming && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setConfirmDeleteId(account.id)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            title={t('provider.inventory.deleteAccount') || 'Eliminar cuenta'}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Confirm Delete */}
                                            {isConfirming && (
                                                <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 mb-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        <span className="text-sm font-medium">
                                                            {t('provider.inventory.confirmDelete') || '¿Eliminar esta cuenta?'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            disabled={isDeleting}
                                                        >
                                                            {t('common.cancel') || 'Cancelar'}
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeleteAccount(account.id)}
                                                            disabled={isDeleting}
                                                        >
                                                            {isDeleting ? (
                                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                                    {t('common.delete') || 'Eliminar'}
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Slots */}
                                            {account.slots.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                                    {account.slots.map((slot) => (
                                                        <div
                                                            key={slot.id}
                                                            className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
                                                        >
                                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span className="flex-1 truncate">{slot.profileName}</span>
                                                            {getStatusBadge(slot.status)}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    {t('provider.inventory.fullAccount') || 'Cuenta Completa (1 slot)'}
                                                    {getStatusBadge(account.availableSlots > 0 ? 'available' : 'sold')}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{t('provider.inventory.noAccounts') || 'No hay cuentas en inventario'}</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
