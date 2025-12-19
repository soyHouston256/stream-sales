'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, Send, DollarSign, User, Image as ImageIcon, ExternalLink } from 'lucide-react';
import NextImage from 'next/image';
import { tokenManager } from '@/lib/utils/tokenManager';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmptyState } from '@/components/ui/empty-state';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

// Map country codes to full names
const COUNTRY_NAMES: Record<string, string> = {
    'PE': 'Perú',
    'CO': 'Colombia',
    'MX': 'México',
    'AR': 'Argentina',
    'CL': 'Chile',
    'BO': 'Bolivia',
    'EC': 'Ecuador',
    'VE': 'Venezuela',
    'BR': 'Brasil',
    'UY': 'Uruguay',
    'PY': 'Paraguay',
    'US': 'Estados Unidos',
};

interface Transfer {
    id: string;
    validator: {
        id: string;
        name: string | null;
        email: string;
        country: string | null;
    };
    totalAmount: string;
    commissionAmount: string;
    transferAmount: string;
    paymentMethod: string;
    holderName: string | null;
    paymentTime: string | null;
    voucherUrl: string | null;
    paymentDetails: string | null;
    status: string;
    rejectionReason: string | null;
    processedBy: { id: string; name: string; email: string } | null;
    processedAt: string | null;
    createdAt: string;
    completedAt: string | null;
    fundEntries: Array<{
        id: string;
        amount: string;
        recharge: {
            id: string;
            amount: string;
            paymentMethod: string;
            createdAt: string;
        };
    }>;
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

export default function AdminValidatorTransfersPage() {
    const { t, language } = useLanguage();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const dateLocale = language === 'es' ? es : enUS;

    const [statusFilter, setStatusFilter] = useState('pending');
    const [page, setPage] = useState(1);
    const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showVoucherDialog, setShowVoucherDialog] = useState(false);

    // Fetch transfers
    const { data, isLoading } = useQuery<TransfersResponse>({
        queryKey: ['admin-validator-transfers', statusFilter, page],
        queryFn: async () => {
            const token = tokenManager.getToken();
            const params = new URLSearchParams({
                status: statusFilter,
                page: page.toString(),
                limit: '10',
            });
            const response = await fetch(`/api/admin/validator-transfers?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch transfers');
            return response.json();
        },
    });

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            const token = tokenManager.getToken();
            const response = await fetch(`/api/admin/validator-transfers/${id}/approve`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to approve transfer');
            }
            return response.json();
        },
        onSuccess: () => {
            toast({
                title: t('admin.validatorTransfers.approveSuccess'),
                description: t('admin.validatorTransfers.approveSuccessDesc'),
            });
            queryClient.invalidateQueries({ queryKey: ['admin-validator-transfers'] });
            setShowApproveDialog(false);
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const token = tokenManager.getToken();
            const response = await fetch(`/api/admin/validator-transfers/${id}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ reason }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to reject transfer');
            }
            return response.json();
        },
        onSuccess: () => {
            toast({
                title: t('admin.validatorTransfers.rejectSuccess'),
                description: t('admin.validatorTransfers.rejectSuccessDesc'),
            });
            queryClient.invalidateQueries({ queryKey: ['admin-validator-transfers'] });
            setShowRejectDialog(false);
            setRejectionReason('');
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const handleApprove = (transfer: Transfer) => {
        setSelectedTransfer(transfer);
        setShowApproveDialog(true);
    };

    const handleReject = (transfer: Transfer) => {
        setSelectedTransfer(transfer);
        setRejectionReason('');
        setShowRejectDialog(true);
    };

    const handleViewVoucher = (transfer: Transfer) => {
        setSelectedTransfer(transfer);
        setShowVoucherDialog(true);
    };

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

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            yape: 'Yape',
            plin: 'Plin',
            binance: 'Binance Pay',
            bank_transfer: 'Transferencia Bancaria',
        };
        // eslint-disable-next-line security/detect-object-injection
        return labels[method] || method;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">{t('admin.validatorTransfers.title')}</h1>
                <p className="text-muted-foreground mt-2">{t('admin.validatorTransfers.subtitle')}</p>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">{t('common.pending')}</SelectItem>
                        <SelectItem value="approved">{t('common.approved')}</SelectItem>
                        <SelectItem value="rejected">{t('common.rejected')}</SelectItem>
                        <SelectItem value="all">{t('common.all')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Transfers Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        {t('admin.validatorTransfers.transfersList')}
                    </CardTitle>
                    <CardDescription>{t('admin.validatorTransfers.transfersListDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : data?.data.length === 0 ? (
                        <EmptyState
                            icon={Send}
                            title={t('admin.validatorTransfers.noTransfers')}
                            description={t('admin.validatorTransfers.noTransfersDesc')}
                        />
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('admin.validatorTransfers.validator')}</TableHead>
                                        <TableHead>{t('admin.validatorTransfers.paymentMethod')}</TableHead>
                                        <TableHead className="text-right">{t('admin.validatorTransfers.totalAmount')}</TableHead>
                                        <TableHead className="text-right">{t('admin.validatorTransfers.commission')}</TableHead>
                                        <TableHead className="text-right">{t('admin.validatorTransfers.toReceive')}</TableHead>
                                        <TableHead>{t('admin.validatorTransfers.date')}</TableHead>
                                        <TableHead>{t('common.status')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.data.map((transfer) => (
                                        <TableRow key={transfer.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{transfer.validator.name || 'N/A'}</div>
                                                    <div className="text-sm text-muted-foreground">{transfer.validator.email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{getPaymentMethodLabel(transfer.paymentMethod)}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">${transfer.totalAmount}</TableCell>
                                            <TableCell className="text-right text-amber-600">-${transfer.commissionAmount}</TableCell>
                                            <TableCell className="text-right font-semibold text-green-600">${transfer.transferAmount}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {format(new Date(transfer.createdAt), 'PP', { locale: dateLocale })}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {transfer.voucherUrl && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewVoucher(transfer)}
                                                        >
                                                            <ImageIcon className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {transfer.status === 'pending' && (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleApprove(transfer)}
                                                                className="text-green-600 hover:text-green-700"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleReject(transfer)}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {data && data.pagination.totalPages > 1 && (
                                <div className="flex justify-center gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                    >
                                        {t('common.previous')}
                                    </Button>
                                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                                        {page} / {data.pagination.totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === data.pagination.totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                    >
                                        {t('common.next')}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            {t('admin.validatorTransfers.approveTransfer')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('admin.validatorTransfers.approveTransferDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTransfer && (
                        <div className="space-y-4">
                            {/* Validator Info */}
                            <div className="bg-muted/50 p-4 rounded-lg flex items-center gap-3">
                                <User className="w-8 h-8 text-muted-foreground" />
                                <div className="flex-1">
                                    <div className="font-medium">{selectedTransfer.validator.name || 'N/A'}</div>
                                    <div className="text-sm text-muted-foreground">{selectedTransfer.validator.email}</div>
                                </div>
                                {selectedTransfer.validator.country && (
                                    <Badge variant="outline" className="text-sm">
                                        🌍 {COUNTRY_NAMES[selectedTransfer.validator.country] || selectedTransfer.validator.country}
                                    </Badge>
                                )}
                            </div>

                            {/* Amount Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg text-center">
                                    <div className="text-sm text-blue-600">{t('admin.validatorTransfers.totalCollected')}</div>
                                    <div className="text-xl font-bold">${selectedTransfer.totalAmount}</div>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg text-center">
                                    <div className="text-sm text-amber-600">{t('admin.validatorTransfers.validatorCommission')}</div>
                                    <div className="text-xl font-bold text-amber-600">-${selectedTransfer.commissionAmount}</div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg text-center">
                                    <div className="text-sm text-green-600">{t('admin.validatorTransfers.youReceive')}</div>
                                    <div className="text-xl font-bold text-green-600">${selectedTransfer.transferAmount}</div>
                                </div>
                            </div>

                            {/* Payment Method badge */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    {t('admin.validatorTransfers.paymentMethod')}
                                </Label>
                                <Badge variant="secondary" className="text-sm px-4 py-2">
                                    {getPaymentMethodLabel(selectedTransfer.paymentMethod)}
                                </Badge>
                            </div>

                            {/* Payment Details Card */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Detalles del Pago
                                </Label>
                                <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                                    {selectedTransfer.holderName && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                {t('admin.validatorTransfers.holderName')}
                                            </p>
                                            <p className="font-medium">{selectedTransfer.holderName}</p>
                                        </div>
                                    )}
                                    {selectedTransfer.paymentTime && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                {t('admin.validatorTransfers.paymentTime')}
                                            </p>
                                            <p className="font-medium">{selectedTransfer.paymentTime}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('admin.validatorTransfers.entriesCount')}
                                        </p>
                                        <p className="font-medium">{selectedTransfer.fundEntries.length}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Voucher */}
                            {selectedTransfer.voucherUrl && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {t('admin.validatorTransfers.paymentVoucher')}
                                    </Label>
                                    <div className="border rounded-lg p-2 bg-muted/30">
                                        <a
                                            href={selectedTransfer.voucherUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                        >
                                            <NextImage
                                                src={selectedTransfer.voucherUrl}
                                                alt={t('admin.validatorTransfers.paymentVoucher')}
                                                width={400}
                                                height={300}
                                                className="max-h-64 mx-auto rounded-lg object-contain hover:opacity-90 transition-opacity cursor-pointer"
                                                unoptimized
                                            />
                                        </a>
                                        <p className="text-xs text-muted-foreground text-center mt-2">
                                            Click en la imagen para ver en tamaño completo
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedTransfer.paymentDetails && (
                                <div className="space-y-2">
                                    <Label>{t('admin.validatorTransfers.additionalNotes')}</Label>
                                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                                        {selectedTransfer.paymentDetails}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={() => selectedTransfer && approveMutation.mutate(selectedTransfer.id)}
                            disabled={approveMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {approveMutation.isPending ? t('common.processing') : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    {t('admin.validatorTransfers.confirmApprove')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            {t('admin.validatorTransfers.rejectTransfer')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('admin.validatorTransfers.rejectTransferDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('admin.validatorTransfers.rejectionReason')} *</Label>
                            <Textarea
                                placeholder={t('admin.validatorTransfers.rejectionReasonPlaceholder')}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedTransfer && rejectMutation.mutate({ id: selectedTransfer.id, reason: rejectionReason })}
                            disabled={rejectMutation.isPending || !rejectionReason.trim()}
                        >
                            {rejectMutation.isPending ? t('common.processing') : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    {t('admin.validatorTransfers.confirmReject')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Voucher Dialog */}
            <Dialog open={showVoucherDialog} onOpenChange={setShowVoucherDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('admin.validatorTransfers.paymentVoucher')}</DialogTitle>
                    </DialogHeader>
                    {selectedTransfer?.voucherUrl && (
                        <div className="flex justify-center">
                            <NextImage
                                src={selectedTransfer.voucherUrl}
                                alt={t('admin.validatorTransfers.paymentVoucher')}
                                width={500}
                                height={600}
                                className="max-h-96 object-contain rounded-lg border"
                                unoptimized
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
