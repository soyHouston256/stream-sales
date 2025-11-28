'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Wallet } from 'lucide-react';
import { Referral, ApproveReferralResponse } from '@/types/affiliate';
import { useToast } from '@/hooks/use-toast';

interface ReferralApprovalDialogProps {
  referral: Referral | null;
  approvalFee: string; // Monto a cobrar al aprobar
  affiliateBalance: string; // Saldo actual del afiliado
  isOpen: boolean;
  onClose: () => void;
  mode: 'approve' | 'reject';
}

/**
 * ReferralApprovalDialog
 *
 * Dialog component for approving or rejecting a referral.
 * Shows approval fee amount and validates sufficient balance before approval.
 *
 * @example
 * <ReferralApprovalDialog
 *   referral={selectedReferral}
 *   approvalFee="10.00"
 *   affiliateBalance="50.00"
 *   isOpen={isDialogOpen}
 *   onClose={() => setIsDialogOpen(false)}
 *   mode="approve"
 * />
 */
export function ReferralApprovalDialog({
  referral,
  approvalFee,
  affiliateBalance,
  isOpen,
  onClose,
  mode,
}: ReferralApprovalDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!referral) return null;

  const fee = parseFloat(approvalFee);
  const balance = parseFloat(affiliateBalance);
  const hasInsufficientBalance = mode === 'approve' && balance < fee;
  const balanceAfterApproval = balance - fee;

  const handleApprove = async () => {
    if (hasInsufficientBalance) {
      setError('Saldo insuficiente para aprobar este referido');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/affiliate/referrals/${referral.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al aprobar referido');
      }

      const data: { message: string; data: ApproveReferralResponse } = await response.json();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });

      toast({
        title: 'Referido aprobado',
        description: `Se ha cobrado ${approvalFee} USD de tu wallet.`,
        variant: 'default',
      });

      onClose();
    } catch (err: any) {
      console.error('Error approving referral:', err);
      setError(err.message || 'Error al aprobar referido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/affiliate/referrals/${referral.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al rechazar referido');
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['referrals'] });

      toast({
        title: 'Referido rechazado',
        description: 'El referido ha sido rechazado sin cargo.',
        variant: 'default',
      });

      onClose();
    } catch (err: any) {
      console.error('Error rejecting referral:', err);
      setError(err.message || 'Error al rechazar referido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'approve') {
      handleApprove();
    } else {
      handleReject();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'approve' ? 'Aprobar Referido' : 'Rechazar Referido'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'approve'
              ? 'Al aprobar este referido, se te cobrará un monto fijo de aprobación.'
              : 'Al rechazar este referido, no se realizará ningún cargo.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Referral Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Referido:</span>
              <span className="text-sm font-semibold">{referral.referredUser.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm">{referral.referredUser.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rol:</span>
              <span className="text-sm capitalize">{referral.referredUser.role}</span>
            </div>
          </div>

          {/* Approval Fee Info (only for approve mode) */}
          {mode === 'approve' && (
            <div className="space-y-3">
              <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-semibold">
                  <Wallet className="h-5 w-5" />
                  <span>Información de Pago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Monto de aprobación:</span>
                  <span className="text-lg font-bold text-amber-900">${approvalFee} USD</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tu saldo actual:</span>
                  <span className="text-sm font-semibold">${affiliateBalance} USD</span>
                </div>
                <div className="flex items-center justify-between border-t border-amber-300 pt-2 mt-2">
                  <span className="text-sm font-medium">Saldo después:</span>
                  <span className={`text-sm font-bold ${hasInsufficientBalance ? 'text-red-600' : 'text-green-600'}`}>
                    ${hasInsufficientBalance ? '0.00' : balanceAfterApproval.toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              {hasInsufficientBalance && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Saldo insuficiente. Necesitas al menos ${approvalFee} USD para aprobar este
                    referido. Por favor, recarga tu wallet antes de continuar.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Rejection Confirmation (only for reject mode) */}
          {mode === 'reject' && (
            <Alert>
              <AlertDescription>
                Esta acción no se puede deshacer. El referido será marcado como rechazado y no
                podrás aprobarlo posteriormente.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (mode === 'approve' && hasInsufficientBalance)}
            variant={mode === 'approve' ? 'default' : 'destructive'}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : mode === 'approve' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Aprobar y Pagar ${approvalFee}
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Rechazar Referido
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
