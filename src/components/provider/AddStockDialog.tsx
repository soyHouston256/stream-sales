'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { tokenManager } from '@/lib/utils/tokenManager';

interface AccountInput {
    email: string;
    password: string;
}

interface AddStockDialogProps {
    productId: string;
    productName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AddStockDialog({
    productId,
    productName,
    isOpen,
    onClose,
    onSuccess,
}: AddStockDialogProps) {
    const { t } = useLanguage();
    const [accounts, setAccounts] = useState<AccountInput[]>([{ email: '', password: '' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const addAccount = () => {
        setAccounts([...accounts, { email: '', password: '' }]);
    };

    const removeAccount = (index: number) => {
        const newAccounts = [...accounts];
        newAccounts.splice(index, 1);
        setAccounts(newAccounts);
    };

    const updateAccount = (index: number, field: 'email' | 'password', value: string) => {
        const newAccounts = [...accounts];
        newAccounts[index][field] = value;
        setAccounts(newAccounts);
    };

    const parseBulkText = (): AccountInput[] => {
        const lines = bulkText.split('\n').filter(line => line.trim());
        return lines.map(line => {
            const parts = line.split(/[:|;,\t]+/).map(p => p.trim());
            return {
                email: parts[0] || '',
                password: parts[1] || '',
            };
        }).filter(a => a.email && a.password);
    };

    const handleSubmit = async () => {
        setError(null);
        setIsSubmitting(true);

        try {
            const accountsToAdd = bulkMode ? parseBulkText() : accounts.filter(a => a.email && a.password);

            if (accountsToAdd.length === 0) {
                setError(t('provider.stock.noAccountsError') || 'Agrega al menos una cuenta');
                setIsSubmitting(false);
                return;
            }

            const token = tokenManager.getToken();
            const response = await fetch(`/api/provider/products/${productId}/inventory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ accounts: accountsToAdd }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error adding stock');
            }

            const result = await response.json();

            // Reset form
            setAccounts([{ email: '', password: '' }]);
            setBulkText('');

            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-indigo-500" />
                        {t('provider.stock.addStock') || 'Agregar Stock'}
                    </DialogTitle>
                    <DialogDescription>
                        {t('provider.stock.addStockDescription')?.replace('{name}', productName) ||
                            `Agrega cuentas al inventario de ${productName}`}
                    </DialogDescription>
                </DialogHeader>

                {/* Mode Toggle */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                    <button
                        onClick={() => setBulkMode(false)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${!bulkMode ? 'bg-background shadow-sm' : 'text-muted-foreground'
                            }`}
                    >
                        {t('provider.stock.manualMode') || 'Manual'}
                    </button>
                    <button
                        onClick={() => setBulkMode(true)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${bulkMode ? 'bg-background shadow-sm' : 'text-muted-foreground'
                            }`}
                    >
                        {t('provider.stock.bulkMode') || 'Masivo'}
                    </button>
                </div>

                {bulkMode ? (
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">
                            {t('provider.stock.bulkLabel') || 'Pega las cuentas (email:password por línea)'}
                        </Label>
                        <Textarea
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder={`cuenta1@email.com:password123
cuenta2@email.com:password456
cuenta3@email.com:password789`}
                            rows={8}
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('provider.stock.bulkHint') || 'Formatos aceptados: email:password, email;password, email,password'}
                        </p>
                        {bulkText && (
                            <p className="text-sm font-medium text-indigo-600">
                                {parseBulkText().length} {t('provider.stock.accountsDetected') || 'cuentas detectadas'}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {accounts.map((account, idx) => (
                            <div key={idx} className="flex gap-2 items-start animate-in slide-in-from-left-2 duration-200">
                                <span className="w-6 h-8 flex items-center justify-center text-xs font-bold text-muted-foreground">
                                    {idx + 1}
                                </span>
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                    <Input
                                        type="email"
                                        value={account.email}
                                        onChange={(e) => updateAccount(idx, 'email', e.target.value)}
                                        placeholder={t('provider.stock.emailPlaceholder') || 'email@ejemplo.com'}
                                        className="text-sm"
                                    />
                                    <Input
                                        type="text"
                                        value={account.password}
                                        onChange={(e) => updateAccount(idx, 'password', e.target.value)}
                                        placeholder={t('provider.stock.passwordPlaceholder') || 'contraseña'}
                                        className="text-sm"
                                    />
                                </div>
                                {accounts.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeAccount(idx)}
                                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addAccount} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            {t('provider.stock.addAnother') || 'Agregar otra cuenta'}
                        </Button>
                    </div>
                )}

                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        {t('common.cancel') || 'Cancelar'}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                {t('common.saving') || 'Guardando...'}
                            </>
                        ) : (
                            <>
                                <Package className="h-4 w-4 mr-2" />
                                {t('provider.stock.addToStock') || 'Agregar al Stock'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
