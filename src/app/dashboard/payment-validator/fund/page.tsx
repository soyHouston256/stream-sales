'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/shared/ImageUpload';
import {
    Landmark, Send, CheckCircle, XCircle, Clock, ArrowUpRight, Receipt,
    Smartphone, Building2, Coins, Check, User, Image as ImageIcon, CreditCard,
    LucideIcon
} from 'lucide-react';
import NextImage from 'next/image';
import { tokenManager } from '@/lib/utils/tokenManager';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, Column } from '@/components/admin/DataTable';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface FundEntry {
    id: string;
    rechargeId: string;
    amount: string;
    status: string;
    createdAt: string;
    recharge: {
        id: string;
        paymentMethod: string;
        createdAt: string;
        user: {
            id: string;
            name: string | null;
            email: string;
        };
    };
}

interface FundData {
    balance: string;
    pendingEntries: FundEntry[];
    transferredTotal: string;
    summary: {
        pendingCount: number;
        transferredCount: number;
    };
}

interface Transfer {
    id: string;
    totalAmount: string;
    commissionAmount: string;
    transferAmount: string;
    paymentMethod: string;
    holderName: string | null;
    paymentTime: string | null;
    voucherUrl: string | null;
    status: string;
    rejectionReason: string | null;
    processedBy: { id: string; name: string; email: string } | null;
    processedAt: string | null;
    createdAt: string;
    completedAt: string | null;
    entriesCount: number;
}

interface TransfersResponse {
    data: Transfer[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface AdminPaymentMethod {
    id: string;
    name: string;
    type: string;
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

const TYPE_ICONS: Record<string, LucideIcon> = {
    mobile: Smartphone,
    bank: Building2,
    crypto: Coins,
};

// Transfer to Admin Dialog Component
function TransferDialog({ currentBalance, onSuccess }: { currentBalance?: string; onSuccess: () => void }) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [commissionAmount, setCommissionAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<AdminPaymentMethod | null>(null);
    const [holderName, setHolderName] = useState('');
    const [paymentTime, setPaymentTime] = useState('');
    const [voucherUrl, setVoucherUrl] = useState('');
    const [paymentDetails, setPaymentDetails] = useState('');

    const balance = parseFloat(currentBalance || '0');
    const commission = parseFloat(commissionAmount) || 0;
    const transferAmount = balance - commission;

    // Fetch admin payment methods
    const { data: methodsData, isLoading: methodsLoading } = useQuery<{ data: AdminPaymentMethod[] }>({
        queryKey: ['admin-payment-methods-for-validator'],
        queryFn: async () => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/payment-validator/admin-payment-methods', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch payment methods');
            return response.json();
        },
        enabled: open,
    });

    const paymentMethods = methodsData?.data || [];

    const createTransferMutation = useMutation({
        mutationFn: async (data: {
            commissionAmount: number;
            paymentMethod: string;
            holderName?: string;
            paymentTime?: string;
            voucherUrl?: string;
            paymentDetails?: string;
        }) => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/payment-validator/fund/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create transfer');
            }
            return response.json();
        },
        onSuccess: () => {
            toast({
                title: t('paymentValidator.fund.transferCreated'),
                description: t('paymentValidator.fund.transferCreatedDesc'),
            });
            setOpen(false);
            resetForm();
            onSuccess();
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const resetForm = () => {
        setCommissionAmount('');
        setSelectedMethod(null);
        setHolderName('');
        setPaymentTime('');
        setVoucherUrl('');
        setPaymentDetails('');
    };

    const handleSubmit = () => {
        if (!selectedMethod) {
            toast({
                title: 'Error',
                description: t('paymentValidator.fund.selectPaymentMethod'),
                variant: 'destructive',
            });
            return;
        }

        createTransferMutation.mutate({
            commissionAmount: commission,
            paymentMethod: selectedMethod.name,
            holderName: holderName || undefined,
            paymentTime: paymentTime || undefined,
            voucherUrl: voucherUrl || undefined,
            paymentDetails: paymentDetails || undefined,
        });
    };

    const getIcon = (type: string) => {
        // eslint-disable-next-line security/detect-object-injection
        const Icon = TYPE_ICONS[type] || Smartphone;
        return <Icon size={20} />;
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
                <Button
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    disabled={balance <= 0}
                >
                    <Send className="w-4 h-4 mr-2" />
                    {t('paymentValidator.fund.transferToAdmin')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden">
                <div className="flex flex-col md:flex-row min-h-[550px]">

                    {/* --- LEFT COLUMN: AMOUNT & PAYMENT METHODS --- */}
                    <div className="w-full md:w-1/2 bg-muted/30 border-r flex flex-col">

                        {/* Header */}
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">{t('paymentValidator.fund.createTransfer')}</h2>
                            <p className="text-muted-foreground text-sm mt-1">{t('paymentValidator.fund.createTransferDesc')}</p>
                        </div>

                        {/* Amount Summary Card */}
                        <div className="p-4">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
                                <div className="flex items-center gap-2 mb-4">
                                    <Landmark className="w-5 h-5" />
                                    <span className="text-sm font-medium opacity-90">{t('paymentValidator.fund.availableBalance')}</span>
                                </div>
                                <div className="text-4xl font-bold mb-6">${currentBalance || '0.00'}</div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-2">
                                        <span className="opacity-80">{t('paymentValidator.fund.yourCommission')}</span>
                                        <span className="font-semibold text-amber-200">-${commissionAmount || '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/20 rounded-lg px-3 py-2">
                                        <span className="font-medium">{t('paymentValidator.fund.amountToAdmin')}</span>
                                        <span className="font-bold text-lg">${transferAmount >= 0 ? transferAmount.toFixed(2) : '0.00'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="px-4 pb-4 flex-1 overflow-y-auto">
                            <Label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                {t('paymentValidator.fund.paymentMethod')}
                            </Label>

                            {methodsLoading ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
                                    ))}
                                </div>
                            ) : paymentMethods.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">{t('paymentValidator.fund.noPaymentMethods')}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {paymentMethods.map((method) => {
                                        const isSelected = selectedMethod?.id === method.id;
                                        return (
                                            <button
                                                key={method.id}
                                                type="button"
                                                onClick={() => setSelectedMethod(method)}
                                                className={`relative p-4 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-2 border-2 group ${isSelected
                                                    ? 'bg-background shadow-md'
                                                    : 'bg-background border-transparent hover:bg-muted'
                                                    }`}
                                                style={{
                                                    borderColor: isSelected ? method.color : 'transparent'
                                                }}
                                            >
                                                <div
                                                    className="w-12 h-12 rounded-full shadow-sm flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110"
                                                    style={{ backgroundColor: method.color }}
                                                >
                                                    {getIcon(method.type)}
                                                </div>
                                                <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {method.name}
                                                </span>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2">
                                                        <Check className="w-4 h-4" style={{ color: method.color }} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Selected Method Details */}
                            {selectedMethod && (
                                <div
                                    className="mt-4 rounded-xl p-4 border"
                                    style={{
                                        backgroundColor: `${selectedMethod.color}10`,
                                        borderColor: `${selectedMethod.color}30`
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: selectedMethod.color }}>
                                            {t('paymentValidator.fund.accountDetails')}
                                        </span>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-background/50" style={{ color: selectedMethod.color }}>
                                            {selectedMethod.name}
                                        </span>
                                    </div>

                                    {selectedMethod.type === 'mobile' && (
                                        <div className="space-y-2">
                                            {selectedMethod.phone && (
                                                <div className="bg-background/80 p-3 rounded-lg">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('paymentValidator.fund.phoneNumber')}</p>
                                                    <p className="font-semibold">{selectedMethod.phone}</p>
                                                </div>
                                            )}
                                            {selectedMethod.qrImage && (
                                                <div className="flex justify-center">
                                                    <NextImage
                                                        src={selectedMethod.qrImage}
                                                        alt="QR Code"
                                                        width={128}
                                                        height={128}
                                                        className="w-32 h-32 rounded-lg object-contain"
                                                        unoptimized
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedMethod.type === 'bank' && (
                                        <div className="space-y-2">
                                            {selectedMethod.bankName && (
                                                <div className="bg-background/80 p-3 rounded-lg">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('paymentValidator.fund.bankName')}</p>
                                                    <p className="font-semibold">{selectedMethod.bankName}</p>
                                                </div>
                                            )}
                                            {selectedMethod.accountNumber && (
                                                <div className="bg-background/80 p-3 rounded-lg">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('paymentValidator.fund.accountNumber')}</p>
                                                    <p className="font-mono text-sm font-semibold">{selectedMethod.accountNumber}</p>
                                                </div>
                                            )}
                                            {selectedMethod.cci && (
                                                <div className="bg-background/80 p-3 rounded-lg">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">CCI / CLABE</p>
                                                    <p className="font-mono text-sm font-semibold">{selectedMethod.cci}</p>
                                                </div>
                                            )}
                                            {selectedMethod.holderName && (
                                                <p className="text-xs text-center text-muted-foreground mt-2">
                                                    {t('paymentValidator.fund.holderLabel')}: <strong>{selectedMethod.holderName}</strong>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {selectedMethod.type === 'crypto' && (
                                        <div className="space-y-2">
                                            {selectedMethod.network && (
                                                <div className="bg-background/80 p-3 rounded-lg">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('paymentValidator.fund.network')}</p>
                                                    <p className="font-semibold">{selectedMethod.network}</p>
                                                </div>
                                            )}
                                            {selectedMethod.walletAddress && (
                                                <div className="bg-background/80 p-3 rounded-lg">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{t('paymentValidator.fund.walletAddress')}</p>
                                                    <p className="font-mono text-xs break-all">{selectedMethod.walletAddress}</p>
                                                </div>
                                            )}
                                            {selectedMethod.qrImage && (
                                                <div className="flex justify-center">
                                                    <NextImage
                                                        src={selectedMethod.qrImage}
                                                        alt="QR Code"
                                                        width={128}
                                                        height={128}
                                                        className="w-32 h-32 rounded-lg object-contain"
                                                        unoptimized
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedMethod.instructions && (
                                        <p className="text-xs text-muted-foreground mt-3 text-center italic">
                                            {selectedMethod.instructions}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- RIGHT COLUMN: FORM --- */}
                    <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-start bg-background overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-1">{t('paymentValidator.fund.reportTransfer')}</h2>
                        <p className="text-muted-foreground mb-6">{t('paymentValidator.fund.reportTransferDesc')}</p>

                        <div className="space-y-5">
                            {/* Commission Input */}
                            <div>
                                <Label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    {t('paymentValidator.fund.commissionAmount')}
                                </Label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-2xl transition-colors group-focus-within:text-primary">
                                        $
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={currentBalance || '0'}
                                        className="pl-10 pr-4 py-3 text-2xl font-bold h-auto border-b-2 border-x-0 border-t-0 rounded-none focus:border-primary bg-transparent placeholder:text-muted-foreground/30"
                                        placeholder="0.00"
                                        value={commissionAmount}
                                        onChange={(e) => setCommissionAmount(e.target.value)}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{t('paymentValidator.fund.commissionHint')}</p>
                            </div>

                            {/* Holder Name */}
                            <div>
                                <Label className="block text-xs font-bold text-foreground mb-1.5">
                                    {t('paymentValidator.fund.holderName')}
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                    <Input
                                        className="pl-10"
                                        placeholder={t('paymentValidator.fund.holderNamePlaceholder')}
                                        value={holderName}
                                        onChange={(e) => setHolderName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Payment Time */}
                            <div>
                                <Label className="block text-xs font-bold text-foreground mb-1.5">
                                    {t('paymentValidator.fund.paymentTime')}
                                </Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                    <Input
                                        type="time"
                                        className="pl-10"
                                        value={paymentTime}
                                        onChange={(e) => setPaymentTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Voucher Upload */}
                            <div>
                                <Label className="block text-xs font-bold text-foreground mb-1.5">
                                    {t('paymentValidator.fund.voucherUrl')}
                                </Label>
                                <ImageUpload
                                    value={voucherUrl}
                                    onChange={(v) => setVoucherUrl(v)}
                                />
                            </div>

                            {/* Additional Notes */}
                            <div>
                                <Label className="block text-xs font-bold text-foreground mb-1.5">
                                    {t('paymentValidator.fund.additionalNotes')}
                                </Label>
                                <Textarea
                                    placeholder={t('paymentValidator.fund.additionalNotesPlaceholder')}
                                    value={paymentDetails}
                                    onChange={(e) => setPaymentDetails(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="mt-6 flex gap-3">
                            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                                {t('common.cancel')}
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={createTransferMutation.isPending || transferAmount < 0 || !selectedMethod}
                                className="flex-1 py-5 font-bold"
                                style={{ backgroundColor: selectedMethod?.color || '#22c55e' }}
                            >
                                {createTransferMutation.isPending ? (
                                    <>{t('common.processing')}...</>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        {t('paymentValidator.fund.submitTransfer')}
                                    </>
                                )}
                            </Button>
                        </div>

                        <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            {t('paymentValidator.fund.validationTime')}
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function ValidatorFundPage() {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();
    const dateLocale = language === 'es' ? es : enUS;

    // Fetch fund data
    const { data: fundData, isLoading: fundLoading } = useQuery<FundData>({
        queryKey: ['validator-fund'],
        queryFn: async () => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/payment-validator/fund', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch fund data');
            return response.json();
        },
    });

    // Fetch transfer history
    const { data: transfersData, isLoading: transfersLoading } = useQuery<TransfersResponse>({
        queryKey: ['validator-fund-transfers'],
        queryFn: async () => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/payment-validator/fund/transfers', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch transfers');
            return response.json();
        },
    });

    const handleTransferSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['validator-fund'] });
        queryClient.invalidateQueries({ queryKey: ['validator-fund-transfers'] });
    };

    const pendingTransfersCount = transfersData?.data.filter(t => t.status === 'pending').length || 0;

    // Status badge helper
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />{t('common.pending')}</Badge>;
            case 'approved':
                return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />{t('common.approved')}</Badge>;
            case 'rejected':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('common.rejected')}</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Columns for fund entries table
    const entryColumns: Column<FundEntry>[] = [
        {
            key: 'user',
            label: t('paymentValidator.fund.user'),
            render: (entry) => (
                <div>
                    <div className="font-medium">{entry.recharge.user.name || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">{entry.recharge.user.email}</div>
                </div>
            ),
        },
        {
            key: 'paymentMethod',
            label: t('paymentValidator.fund.paymentMethod'),
            render: (entry) => (
                <span className="text-sm capitalize">{entry.recharge.paymentMethod.replace('_', ' ')}</span>
            ),
        },
        {
            key: 'amount',
            label: t('paymentValidator.fund.amount'),
            render: (entry) => (
                <span className="font-medium text-green-600">+${entry.amount}</span>
            ),
        },
        {
            key: 'createdAt',
            label: t('paymentValidator.fund.approvedAt'),
            render: (entry) => (
                <span className="text-sm">{format(new Date(entry.createdAt), 'PPp', { locale: dateLocale })}</span>
            ),
        },
    ];

    // Columns for transfers table
    const transferColumns: Column<Transfer>[] = [
        {
            key: 'createdAt',
            label: t('paymentValidator.fund.date'),
            render: (transfer) => (
                <div>
                    <div className="font-medium">{format(new Date(transfer.createdAt), 'PP', { locale: dateLocale })}</div>
                    <div className="text-sm text-muted-foreground">{transfer.entriesCount} {t('paymentValidator.fund.entries')}</div>
                </div>
            ),
        },
        {
            key: 'paymentMethod',
            label: t('paymentValidator.fund.paymentMethod'),
            render: (transfer) => (
                <span className="text-sm capitalize">{transfer.paymentMethod.replace('_', ' ')}</span>
            ),
        },
        {
            key: 'totalAmount',
            label: t('paymentValidator.fund.totalAmount'),
            render: (transfer) => <span className="font-medium">${transfer.totalAmount}</span>,
        },
        {
            key: 'commissionAmount',
            label: t('paymentValidator.fund.commission'),
            render: (transfer) => <span className="text-amber-600">-${transfer.commissionAmount}</span>,
        },
        {
            key: 'transferAmount',
            label: t('paymentValidator.fund.transferred'),
            render: (transfer) => <span className="font-semibold text-green-600">${transfer.transferAmount}</span>,
        },
        {
            key: 'status',
            label: t('common.status'),
            render: (transfer) => (
                <div className="flex flex-col gap-1">
                    {getStatusBadge(transfer.status)}
                    {transfer.rejectionReason && (
                        <span className="text-xs text-red-500">{transfer.rejectionReason}</span>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('paymentValidator.fund.title')}</h1>
                    <p className="text-muted-foreground mt-1">{t('paymentValidator.fund.subtitle')}</p>
                </div>
                <TransferDialog currentBalance={fundData?.balance} onSuccess={handleTransferSuccess} />
            </div>

            {/* Stats Cards - Same layout as seller wallet */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="col-span-2">
                    <StatCard
                        label={t('paymentValidator.fund.availableBalance')}
                        value={`$${fundData?.balance || '0.00'}`}
                        description={`${fundData?.summary.pendingCount || 0} ${t('paymentValidator.fund.entriesPending')}`}
                        icon={Landmark}
                        color="green"
                        isLoading={fundLoading}
                    />
                </div>

                <StatCard
                    label={t('paymentValidator.fund.transferredTotal')}
                    value={`$${fundData?.transferredTotal || '0.00'}`}
                    description={t('paymentValidator.fund.transfersCompleted')}
                    icon={ArrowUpRight}
                    color="blue"
                    isLoading={fundLoading}
                />

                <StatCard
                    label={t('paymentValidator.fund.pendingTransfers')}
                    value={pendingTransfersCount.toString()}
                    description={t('paymentValidator.fund.awaitingAdminApproval')}
                    icon={Clock}
                    color="orange"
                    isLoading={transfersLoading}
                />
            </div>

            {/* Fund Entries - Pending */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CardTitle>{t('paymentValidator.fund.fundEntries')}</CardTitle>
                    </div>
                    <CardDescription>{t('paymentValidator.fund.fundEntriesDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        data={fundData?.pendingEntries || []}
                        columns={entryColumns}
                        isLoading={fundLoading}
                        emptyMessage={t('paymentValidator.fund.noEntries')}
                        emptyState={{
                            icon: Landmark,
                            title: t('paymentValidator.fund.noEntries'),
                            description: t('paymentValidator.fund.noEntriesDesc'),
                            variant: 'default',
                        }}
                    />
                </CardContent>
            </Card>

            {/* Transfer History */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('paymentValidator.fund.transferHistory')}</CardTitle>
                    <CardDescription>{t('paymentValidator.fund.transferHistoryDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        data={transfersData?.data || []}
                        columns={transferColumns}
                        isLoading={transfersLoading}
                        emptyMessage={t('paymentValidator.fund.noTransfers')}
                        emptyState={{
                            icon: Receipt,
                            title: t('paymentValidator.fund.noTransfers'),
                            description: t('paymentValidator.fund.noTransfersDesc'),
                            variant: 'default',
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
