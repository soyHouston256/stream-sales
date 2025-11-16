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
import { Separator } from '@/components/ui/separator';
import { useReferralDetails } from '@/lib/hooks';
import { ReferralStatusBadge } from './ReferralStatusBadge';
import { CommissionTypeBadge } from './CommissionTypeBadge';
import { formatCommissionAmount } from '@/lib/utils/affiliate';
import { User, Mail, Calendar, DollarSign, Activity } from 'lucide-react';

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Referral Details</DialogTitle>
          <DialogDescription>Complete information about this referral</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        ) : referral ? (
          <div className="space-y-6">
            {/* User Information */}
            <div className="space-y-3">
              <h3 className="font-semibold">User Information</h3>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{referral.referredUser.name}</span>
                  <Badge variant="outline" className="ml-auto">
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
                    Registered on {format(new Date(referral.createdAt), 'PPP')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <ReferralStatusBadge status={referral.status} />
                </div>
              </div>
            </div>

            {/* Activity Summary */}
            <div className="space-y-3">
              <h3 className="font-semibold">Activity Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                {referral.activitySummary.totalPurchases !== undefined && (
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold">{referral.activitySummary.totalPurchases}</div>
                    <div className="text-xs text-muted-foreground">Purchases</div>
                  </div>
                )}
                {referral.activitySummary.totalProducts !== undefined && (
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold">{referral.activitySummary.totalProducts}</div>
                    <div className="text-xs text-muted-foreground">Products</div>
                  </div>
                )}
                {referral.activitySummary.totalSales !== undefined && (
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold">{referral.activitySummary.totalSales}</div>
                    <div className="text-xs text-muted-foreground">Sales</div>
                  </div>
                )}
              </div>
            </div>

            {/* Commission Summary */}
            <div className="space-y-3">
              <h3 className="font-semibold">Commission Summary</h3>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-muted-foreground">Total Commission Earned</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCommissionAmount(referral.totalCommissionEarned)}
                  </span>
                </div>
              </div>
            </div>

            {/* Commission Timeline */}
            {referral.commissionTimeline && referral.commissionTimeline.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Commission History</h3>
                <div className="rounded-lg border">
                  <div className="max-h-60 overflow-y-auto">
                    {referral.commissionTimeline.map((commission, index) => (
                      <div key={commission.id}>
                        {index > 0 && <Separator />}
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <CommissionTypeBadge type={commission.type} />
                            <span className="font-semibold">
                              {formatCommissionAmount(commission.amount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{format(new Date(commission.createdAt), 'PPp')}</span>
                            <Badge
                              variant={commission.status === 'paid' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {commission.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Referral details not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
