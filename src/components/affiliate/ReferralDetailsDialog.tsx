'use client';

import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useReferralDetails } from '@/lib/hooks';
import { ReferralApprovalStatusBadge } from './ReferralApprovalStatusBadge';
import { User, Mail, Calendar, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReferralDetailsDialogProps {
  referralId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReferralDetailsDialog({
  referralId,
  isOpen,
  onClose,
}: ReferralDetailsDialogProps) {
  const { data: referral, isLoading } = useReferralDetails(referralId);
  const { t } = useLanguage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('affiliate.referralDetails.title')}</DialogTitle>
          <DialogDescription>{t('affiliate.referralDetails.description')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : referral ? (
          <div className="space-y-6">
            {/* User Information */}
            <div className="space-y-3">
              <h3 className="font-semibold">{t('affiliate.referralDetails.userInformation')}</h3>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{referral.referredUser.name}</span>
                  <Badge variant="outline" className="ml-auto capitalize">
                    {referral.referredUser.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{referral.referredUser.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t('affiliate.referralDetails.registeredOn')} {format(new Date(referral.createdAt), 'PPP')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('affiliate.referralDetails.approvalStatus')}:</span>
                  <ReferralApprovalStatusBadge status={referral.approvalStatus} />
                </div>
                {referral.approvalFee && (
                  <div className="rounded-lg bg-muted/50 p-3 mt-2">
                    <p className="text-sm">
                      <span className="font-medium">{t('affiliate.referralDetails.approvalFeePaid')}:</span> ${referral.approvalFee}
                    </p>
                    {referral.approvedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('affiliate.referralDetails.approvedOn')} {format(new Date(referral.approvedAt), 'PPp')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            {t('affiliate.referralDetails.noDetails')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
