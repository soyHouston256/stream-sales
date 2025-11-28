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
import { CheckCircle, XCircle, Wallet } from 'lucide-react';
import { tokenManager } from '@/lib/utils/tokenManager';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmptyState } from '@/components/ui/empty-state';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Recharge {
  id: string;
  walletId: string;
  user: User;
  walletBalance: string;
  amount: string;
  paymentMethod: string;
  paymentGateway: string;
  externalTransactionId: string | null;
  status: string;
  metadata: any;
  createdAt: string;
  completedAt: string | null;
}

interface RechargesResponse {
  data: Recharge[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PaymentValidatorRechargesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const [selectedRecharge, setSelectedRecharge] = useState<Recharge | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [externalTxId, setExternalTxId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch recharges
  const { data: rechargesData, isLoading } = useQuery<RechargesResponse>({
    queryKey: ['payment-validator-recharges', statusFilter, page],
    queryFn: async () => {
      const token = tokenManager.getToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status: statusFilter,
      });

      const response = await fetch(`/api/payment-validator/recharges?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch recharges');
      return response.json();
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, externalTransactionId }: { id: string; externalTransactionId?: string }) => {
      const token = tokenManager.getToken();
      const response = await fetch(`/api/payment-validator/recharges/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ externalTransactionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve recharge');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('paymentValidator.recharges.approveTitle'),
        description: `Balance updated: $${data.newWalletBalance}`,
      });
      queryClient.invalidateQueries({ queryKey: ['payment-validator-recharges'] });
      setShowApproveDialog(false);
      setSelectedRecharge(null);
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
      const response = await fetch(`/api/payment-validator/recharges/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject recharge');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('paymentValidator.recharges.rejectTitle'),
        description: t('paymentValidator.recharges.rejectDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['payment-validator-recharges'] });
      setShowRejectDialog(false);
      setSelectedRecharge(null);
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>;
  };

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

  const confirmApprove = () => {
    if (!selectedRecharge) return;
    approveMutation.mutate({
      id: selectedRecharge.id,
      externalTransactionId: externalTxId || undefined,
    });
  };

  const confirmReject = () => {
    if (!selectedRecharge || !rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: t('paymentValidator.recharges.rejectionMinLength'),
        variant: 'destructive',
      });
      return;
    }

    if (rejectionReason.length < 10) {
      toast({
        title: 'Error',
        description: t('paymentValidator.recharges.rejectionMinLength'),
        variant: 'destructive',
      });
      return;
    }

    rejectMutation.mutate({
      id: selectedRecharge.id,
      reason: rejectionReason,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('paymentValidator.recharges.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('paymentValidator.recharges.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('paymentValidator.recharges.pendingRecharges')}</CardTitle>
              <CardDescription>{t('paymentValidator.recharges.reviewApprove')}</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('paymentValidator.recharges.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t('paymentValidator.recharges.pending')}</SelectItem>
                <SelectItem value="completed">{t('paymentValidator.recharges.completed')}</SelectItem>
                <SelectItem value="failed">{t('paymentValidator.recharges.failed')}</SelectItem>
                <SelectItem value="cancelled">{t('paymentValidator.recharges.cancelled')}</SelectItem>
                <SelectItem value="all">{t('paymentValidator.recharges.allStatuses')}</SelectItem>
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
          ) : rechargesData?.data.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={statusFilter === 'pending'
                ? t('paymentValidator.recharges.noPendingRecharges') || 'No pending recharges'
                : t('paymentValidator.recharges.noRecharges') || 'No recharges found'
              }
              description={statusFilter === 'pending'
                ? t('paymentValidator.recharges.noPendingRechargesDesc') || 'No pending recharge requests at the moment'
                : t('paymentValidator.recharges.noRechargesDesc') || 'No recharge requests found with the current filters'
              }
              variant="default"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('paymentValidator.recharges.user')}</TableHead>
                    <TableHead>{t('paymentValidator.recharges.amount')}</TableHead>
                    <TableHead>{t('paymentValidator.recharges.paymentMethod')}</TableHead>
                    <TableHead>{t('paymentValidator.recharges.status')}</TableHead>
                    <TableHead>{t('paymentValidator.recharges.requested')}</TableHead>
                    <TableHead>{t('paymentValidator.recharges.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rechargesData?.data.map((recharge) => (
                    <TableRow key={recharge.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{recharge.user.name}</div>
                          <div className="text-sm text-muted-foreground">{recharge.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${recharge.amount}</TableCell>
                      <TableCell>{recharge.paymentMethod}</TableCell>
                      <TableCell>{getStatusBadge(recharge.status)}</TableCell>
                      <TableCell>{new Date(recharge.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {recharge.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRecharge(recharge);
                                setShowApproveDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {t('paymentValidator.recharges.approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRecharge(recharge);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {t('paymentValidator.recharges.reject')}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {rechargesData && rechargesData.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    {t('paymentValidator.recharges.previous')}
                  </Button>
                  <span className="py-2 px-4">
                    {t('paymentValidator.recharges.page')} {page} {t('paymentValidator.recharges.of')} {rechargesData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={page === rechargesData.pagination.totalPages}
                  >
                    {t('paymentValidator.recharges.next')}
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
            <DialogTitle>{t('paymentValidator.recharges.approveTitle')}</DialogTitle>
            <DialogDescription>
              {t('paymentValidator.recharges.approveDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedRecharge && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.recharges.user')}:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRecharge.user.name} ({selectedRecharge.user.email})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.recharges.amount')}:</p>
                <p className="text-2xl font-bold">${selectedRecharge.amount}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.recharges.paymentMethod')}:</p>
                <p className="text-sm text-muted-foreground">
                  {getPaymentMethodLabel(selectedRecharge.paymentMethod)}
                </p>
              </div>
              {selectedRecharge.metadata?.paymentDetails && (
                <div>
                  <p className="text-sm font-medium">{t('seller.wallet.paymentDetails') || 'Payment Details'}:</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecharge.metadata.paymentDetails}
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="externalTxId">
                  {t('seller.wallet.externalTransactionId') || 'External Transaction ID'} ({t('seller.wallet.optional') || 'Optional'})
                </Label>
                <Input
                  id="externalTxId"
                  placeholder="e.g., BANK_REF_123456"
                  value={externalTxId}
                  onChange={(e) => setExternalTxId(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              {t('paymentValidator.recharges.cancel')}
            </Button>
            <Button onClick={confirmApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? t('paymentValidator.recharges.approving') : t('paymentValidator.recharges.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('paymentValidator.recharges.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('paymentValidator.recharges.rejectDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedRecharge && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.recharges.user')}:</p>
                <p className="text-sm text-muted-foreground">{selectedRecharge.user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('paymentValidator.recharges.amount')}:</p>
                <p className="text-lg font-bold">${selectedRecharge.amount}</p>
              </div>
              <div>
                <Label htmlFor="reason">{t('paymentValidator.recharges.rejectionReason')}</Label>
                <Textarea
                  id="reason"
                  placeholder={t('paymentValidator.recharges.rejectionPlaceholder')}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {t('paymentValidator.recharges.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending || rejectionReason.length < 10}
            >
              {rejectMutation.isPending ? t('paymentValidator.recharges.rejecting') : t('paymentValidator.recharges.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
