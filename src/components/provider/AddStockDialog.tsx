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
import { Plus, Trash2, Package, User, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { tokenManager } from '@/lib/utils/tokenManager';

interface ProfileInput {
    name: string;
    pin: string;
}

interface AccountInput {
    email: string;
    password: string;
    accountType: 'full' | 'profiles';
    profiles: ProfileInput[];
    isExpanded: boolean;
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
    const [accounts, setAccounts] = useState<AccountInput[]>([
        { email: '', password: '', accountType: 'full', profiles: [], isExpanded: true }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const addAccount = () => {
        setAccounts([...accounts, { email: '', password: '', accountType: 'full', profiles: [], isExpanded: true }]);
    };

    const removeAccount = (index: number) => {
        const newAccounts = [...accounts];
        newAccounts.splice(index, 1);
        setAccounts(newAccounts);
    };

    const updateAccount = (index: number, field: keyof AccountInput, value: any) => {
        const newAccounts = [...accounts];
        (newAccounts[index] as any)[field] = value;

        // If switching to profiles type and no profiles exist, add one default
        if (field === 'accountType' && value === 'profiles' && newAccounts[index].profiles.length === 0) {
            newAccounts[index].profiles = [{ name: 'Perfil 1', pin: '' }];
        }

        setAccounts(newAccounts);
    };

    const addProfile = (accountIndex: number) => {
        const newAccounts = [...accounts];
        const profileNum = newAccounts[accountIndex].profiles.length + 1;
        newAccounts[accountIndex].profiles.push({ name: `Perfil ${profileNum}`, pin: '' });
        setAccounts(newAccounts);
    };

    const removeProfile = (accountIndex: number, profileIndex: number) => {
        const newAccounts = [...accounts];
        newAccounts[accountIndex].profiles.splice(profileIndex, 1);
        setAccounts(newAccounts);
    };

    const updateProfile = (accountIndex: number, profileIndex: number, field: 'name' | 'pin', value: string) => {
        const newAccounts = [...accounts];
        newAccounts[accountIndex].profiles[profileIndex][field] = value;
        setAccounts(newAccounts);
    };

    const toggleExpanded = (index: number) => {
        const newAccounts = [...accounts];
        newAccounts[index].isExpanded = !newAccounts[index].isExpanded;
        setAccounts(newAccounts);
    };

    const parseBulkText = () => {
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
            let accountsToAdd;

            if (bulkMode) {
                accountsToAdd = parseBulkText();
            } else {
                accountsToAdd = accounts
                    .filter(a => a.email && a.password)
                    .map(a => ({
                        email: a.email,
                        password: a.password,
                        profiles: a.accountType === 'profiles' ? a.profiles : undefined,
                    }));
            }

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

            // Reset form
            setAccounts([{ email: '', password: '', accountType: 'full', profiles: [], isExpanded: true }]);
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
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
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
                    <div className="space-y-4">
                        {accounts.map((account, idx) => (
                            <div
                                key={idx}
                                className="border rounded-xl p-4 space-y-3 animate-in slide-in-from-left-2 duration-200"
                            >
                                {/* Account Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            {idx + 1}
                                        </span>
                                        <span className="text-sm font-medium">
                                            {t('provider.stock.account') || 'Cuenta'} {idx + 1}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => toggleExpanded(idx)}
                                            className="h-7 w-7"
                                        >
                                            {account.isExpanded ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </Button>
                                        {accounts.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeAccount(idx)}
                                                className="text-muted-foreground hover:text-destructive h-7 w-7"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {account.isExpanded && (
                                    <>
                                        {/* Email & Password */}
                                        <div className="grid grid-cols-2 gap-2">
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

                                        {/* Account Type Toggle */}
                                        <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => updateAccount(idx, 'accountType', 'full')}
                                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all ${account.accountType === 'full'
                                                        ? 'bg-background shadow-sm text-emerald-600'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                <User className="h-4 w-4" />
                                                {t('provider.stock.fullAccount') || 'Cuenta Completa'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateAccount(idx, 'accountType', 'profiles')}
                                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all ${account.accountType === 'profiles'
                                                        ? 'bg-background shadow-sm text-indigo-600'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                <Users className="h-4 w-4" />
                                                {t('provider.stock.profilesAccount') || 'Por Perfiles'}
                                            </button>
                                        </div>

                                        {/* Profiles Section */}
                                        {account.accountType === 'profiles' && (
                                            <div className="space-y-2 pl-4 border-l-2 border-indigo-200 dark:border-indigo-800">
                                                <Label className="text-xs font-medium text-muted-foreground">
                                                    {t('provider.stock.profiles') || 'Perfiles'}
                                                </Label>
                                                {account.profiles.map((profile, pIdx) => (
                                                    <div key={pIdx} className="flex gap-2 items-center">
                                                        <Input
                                                            type="text"
                                                            value={profile.name}
                                                            onChange={(e) => updateProfile(idx, pIdx, 'name', e.target.value)}
                                                            placeholder={t('provider.stock.profileName') || 'Nombre del perfil'}
                                                            className="text-sm flex-1"
                                                        />
                                                        <Input
                                                            type="text"
                                                            value={profile.pin}
                                                            onChange={(e) => updateProfile(idx, pIdx, 'pin', e.target.value)}
                                                            placeholder={t('provider.stock.profilePin') || 'PIN (opcional)'}
                                                            className="text-sm w-28"
                                                        />
                                                        {account.profiles.length > 1 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeProfile(idx, pIdx)}
                                                                className="text-muted-foreground hover:text-destructive h-8 w-8 flex-shrink-0"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => addProfile(idx)}
                                                    className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    {t('provider.stock.addProfile') || 'Agregar Perfil'}
                                                </Button>
                                            </div>
                                        )}
                                    </>
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
