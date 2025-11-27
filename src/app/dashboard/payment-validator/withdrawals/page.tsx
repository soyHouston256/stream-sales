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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { tokenManager } from '@/lib/utils/tokenManager';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Withdrawal {
  id: string;
  walletId: string;
  user: User;
  walletBalance: string;
  amount: string;
  paymentMethod: string;
  paymentDetails: string;
  status: string;
  notes: string | null;
  rejectionReason: string | null;
  transactionId: string | null;
  requestedAt: string;
  processedAt: string | null;
  completedAt: string | null;
  processedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface WithdrawalsResponse {
  data: Withdrawal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PaymentValidatorWithdrawalsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [externalTxId, setExternalTxId] = useState('');
  const [confirmComplete, setConfirmComplete] = useState(false);

  // Fetch withdrawals
  const { data: withdrawalsData, isLoading } = useQuery<WithdrawalsResponse>({
    queryKey: ['payment-validator-withdrawals', statusFilter, page],
    queryFn: async () => {
      const token = tokenManager.getToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status: statusFilter,
      });

      const response = await fetch(`/api/payment-validator/withdrawals?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch withdrawals');
      return response.json();
    },
  });

  // Helper function for payment method labels
  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      credit_card: t('seller.wallet.creditCard') || 'Credit Card',
      paypal: t('seller.wallet.paypal') || 'PayPal',
      bank_transfer: t('seller.wallet.bankTransfer') || 'Bank Transfer',
      crypto: t('seller.wallet.crypto') || 'Cryptocurrency',
      mock: 'Mock Payment',
    };
    return labels[method] || method;
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, externalTransactionId }: { id: string; externalTransactionId?: string }) => {
      const token = tokenManager.getToken();
      const response = await fetch(`/api/payment-validator/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ externalTransactionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve withdrawal');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('paymentValidator.withdrawals.approveTitle'),
        description: t('paymentValidator.withdrawals.approveDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['payment-validator-withdrawals'] });
      setShowApproveDialog(false);
      setSelectedWithdrawal(null);
      setExternalTxId('');
    },
    onError: (error: any) => {
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
      const response = await fetch(`/api/payment-validator/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject withdrawal');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('paymentValidator.withdrawals.rejectTitle'),
        description: t('paymentValidator.withdrawals.rejectDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['payment-validator-withdrawals'] });
      setShowRejectDialog(false);
      setSelectedWithdrawal(null);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = tokenManager.getToken();
      const response = await fetch(`/api/payment-validator/withdrawals/${id}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete withdrawal');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('paymentValidator.withdrawals.completeTitle'),
        description: `${t('paymentValidator.withdrawals.completeDescription')}: $${data.newWalletBalance}`,
      });
      queryClient.invalidateQueries({ queryKey: ['payment-validator-withdrawals'] });
      setShowCompleteDialog(false);
      setSelectedWithdrawal(null);
      setConfirmComplete(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      pending: { variant: 'secondary', label: t('paymentValidator.withdrawals.pending').toUpperCase() },
      approved: { variant: 'default', label: t('paymentValidator.withdrawals.approvedStatus').toUpperCase() },
      rejected: { variant: 'destructive', label: t('paymentValidator.withdrawals.rejected').toUpperCase() },
      completed: { variant: 'outline', label: t('paymentValidator.withdrawals.completed').toUpperCase() },
    };
    const config = variants[status] || { variant: 'default', label: status.toUpperCase() };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('paymentValidator.withdrawals.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('paymentValidator.withdrawals.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('paymentValidator.withdrawals.pendingWithdrawals')}</CardTitle>
              <CardDescription>{t('paymentValidator.withdrawals.reviewApprove')}</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('paymentValidator.withdrawals.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t('paymentValidator.withdrawals.pending')}</SelectItem>
                <SelectItem value="approved">{t('paymentValidator.withdrawals.approvedStatus')}</SelectItem>
                <SelectItem value="rejected">{t('paymentValidator.withdrawals.rejected')}</SelectItem>
                <SelectItem value="completed">{t('paymentValidator.withdrawals.completed')}</SelectItem>
                <SelectItem value="all">{t('paymentValidator.withdrawals.allStatuses')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('paymentValidator.withdrawals.user')}</TableHead>
                    <TableHead>{t('paymentValidator.withdrawals.amount')}</TableHead>
                    <TableHead>{t('paymentValidator.withdrawals.paymentMethod')}</TableHead>
                    <TableHead>{t('paymentValidator.withdrawals.paymentDetails')}</TableHead>
                    <TableHead>{t('paymentValidator.withdrawals.status')}</TableHead>
                    <TableHead>{t('paymentValidator.withdrawals.requested')}</TableHead>
                    <TableHead>{t('paymentValidator.withdrawals.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalsData?.data.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{withdrawal.user.name}</div>
                          <div className="text-sm text-muted-foreground">{withdrawal.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${withdrawal.amount}</TableCell>
                      <TableCell>{withdrawal.paymentMethod}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{withdrawal.paymentDetails}</TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell>{new Date(withdrawal.requestedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {withdrawal.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setShowApproveDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {t('paymentValidator.withdrawals.approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {t('paymentValidator.withdrawals.reject')}
                            </Button>
                          </div>
                        )}
                        {withdrawal.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedWithdrawal(withdrawal);
                              setShowCompleteDialog(true);
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            {t('paymentValidator.withdrawals.complete')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {withdrawalsData && withdrawalsData.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    {t('paymentValidator.withdrawals.previous')}
                  </Button>
                  <span className="py-2 px-4">
                    {t('paymentValidator.withdrawals.page')} {page} {t('paymentValidator.withdrawals.of')} {withdrawalsData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={page === withdrawalsData.pagination.totalPages}
                  >
                    {t('paymentValidator.withdrawals.next')}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('paymentValidator.withdrawals.approveTitle')}</DialogTitle>
            <DialogDescription>
              {t('paymentValidator.withdrawals.approveDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.withdrawals.user')}:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedWithdrawal.user.name} ({selectedWithdrawal.user.email})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.withdrawals.amount')}:</p>
                <p className="text-2xl font-bold">${selectedWithdrawal.amount}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.withdrawals.paymentMethod')}:</p>
                <p className="text-sm text-muted-foreground">{getPaymentMethodLabel(selectedWithdrawal.paymentMethod)}</p>
              </div>
              {selectedWithdrawal.paymentDetails && (
                <div>
                  <p className="text-sm font-medium">{t('paymentValidator.withdrawals.paymentDetails')}:</p>
                  <p className="text-sm text-muted-foreground">{selectedWithdrawal.paymentDetails}</p>
                </div>
              )}
              <div>
                <Label htmlFor="externalTxId">{t('paymentValidator.withdrawals.externalTxId') || 'External Transaction ID'} ({t('paymentValidator.withdrawals.optional') || 'Optional'})</Label>
                <Input
                  id="externalTxId"
                  placeholder={t('paymentValidator.withdrawals.externalTxIdPlaceholder') || 'e.g., BANK_REF_123456'}
                  value={externalTxId}
                  onChange={(e) => setExternalTxId(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('paymentValidator.withdrawals.approveNote')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              {t('paymentValidator.withdrawals.cancel')}
            </Button>
            <Button
              onClick={() => selectedWithdrawal && approveMutation.mutate({
                id: selectedWithdrawal.id,
                externalTransactionId: externalTxId || undefined
              })}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? t('paymentValidator.withdrawals.approving') : t('paymentValidator.withdrawals.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('paymentValidator.withdrawals.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('paymentValidator.withdrawals.rejectDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.withdrawals.user')}:</p>
                <p className="text-sm text-muted-foreground">{selectedWithdrawal.user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.withdrawals.amount')}:</p>
                <p className="text-lg font-bold">${selectedWithdrawal.amount}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.withdrawals.paymentMethod')}:</p>
                <p className="text-sm text-muted-foreground">{getPaymentMethodLabel(selectedWithdrawal.paymentMethod)}</p>
              </div>
              <div>
                <Label htmlFor="reason">{t('paymentValidator.withdrawals.rejectionReason')} *</Label>
                <Textarea
                  id="reason"
                  placeholder={t('paymentValidator.withdrawals.rejectionPlaceholder')}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {t('paymentValidator.withdrawals.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedWithdrawal && rejectionReason.length >= 10) {
                  rejectMutation.mutate({ id: selectedWithdrawal.id, reason: rejectionReason });
                } else {
                  toast({
                    title: 'Error',
                    description: t('paymentValidator.withdrawals.rejectionMinLength'),
                    variant: 'destructive',
                  });
                }
              }}
              disabled={rejectMutation.isPending || rejectionReason.length < 10}
            >
              {rejectMutation.isPending ? t('paymentValidator.withdrawals.rejecting') : t('paymentValidator.withdrawals.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('paymentValidator.withdrawals.completeTitle')}</DialogTitle>
            <DialogDescription>
              {t('paymentValidator.withdrawals.completeDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.withdrawals.user')}:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedWithdrawal.user.name} ({selectedWithdrawal.user.email})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.withdrawals.amount')}:</p>
                <p className="text-2xl font-bold">${selectedWithdrawal.amount}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.withdrawals.paymentMethod')}:</p>
                <p className="text-sm text-muted-foreground">{getPaymentMethodLabel(selectedWithdrawal.paymentMethod)}</p>
              </div>
              {selectedWithdrawal.paymentDetails && (
                <div>
                  <p className="text-sm font-medium">{t('paymentValidator.withdrawals.paymentDetails')}:</p>
                  <p className="text-sm text-muted-foreground">{selectedWithdrawal.paymentDetails}</p>
                </div>
              )}
              <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  {t('paymentValidator.withdrawals.completeWarning')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirmComplete"
                  checked={confirmComplete}
                  onCheckedChange={(checked) => setConfirmComplete(checked as boolean)}
                />
                <label
                  htmlFor="confirmComplete"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('paymentValidator.withdrawals.confirmCheckbox') || 'I confirm that I have sent the payment and want to deduct funds from the wallet'}
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              {t('paymentValidator.withdrawals.cancel')}
            </Button>
            <Button
              onClick={() => selectedWithdrawal && completeMutation.mutate(selectedWithdrawal.id)}
              disabled={completeMutation.isPending || !confirmComplete}
            >
              {completeMutation.isPending ? t('paymentValidator.withdrawals.completing') : t('paymentValidator.withdrawals.confirmComplete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
