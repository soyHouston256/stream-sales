import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dispute } from '@/types/conciliator';
import { DisputeStatusBadge } from './DisputeStatusBadge';
import { SLAIndicator } from './SLAIndicator';

interface DisputeDetailsCardProps {
  dispute: Dispute;
}

export function DisputeDetailsCard({ dispute }: DisputeDetailsCardProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Purchase Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Purchase Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Product</label>
            <div className="mt-1">
              <Badge variant="outline" className="mr-2">
                {dispute.purchase.product.category}
              </Badge>
              <p className="mt-1 font-medium">{dispute.purchase.product.name}</p>
              <p className="text-sm text-muted-foreground">{dispute.purchase.product.description}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Amount</label>
            <p className="mt-1 font-medium text-lg">${dispute.purchase.amount}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Purchase Date</label>
            <p className="mt-1">
              {dispute.purchase.createdAt
                ? format(new Date(dispute.purchase.createdAt), 'PPP')
                : 'N/A'}
            </p>
          </div>

          {dispute.purchase.product.accountEmail && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Credentials</label>
              <div className="mt-1 rounded-md bg-muted p-3">
                <p className="text-sm">
                  <span className="font-medium">Email:</span> {dispute.purchase.product.accountEmail}
                </p>
                {dispute.purchase.product.accountPassword && (
                  <p className="text-sm">
                    <span className="font-medium">Password:</span> {dispute.purchase.product.accountPassword}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Seller</label>
              <p className="mt-1 font-medium">{dispute.seller?.name || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">{dispute.seller?.email || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Provider</label>
              <p className="mt-1 font-medium">{dispute.provider?.name || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">{dispute.provider?.email || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispute Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dispute Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Dispute ID</label>
            <p className="mt-1 font-mono text-sm">{dispute.id}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Opened By</label>
            <div className="mt-1">
              <Badge variant={dispute.openedBy === 'seller' ? 'default' : 'secondary'}>
                {dispute.openedBy === 'seller' ? 'Seller' : 'Provider'}
              </Badge>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Reason</label>
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{dispute.reason}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <div className="mt-1 flex items-center gap-2">
              <DisputeStatusBadge status={dispute.status} />
              <SLAIndicator dispute={dispute} />
            </div>
          </div>

          {dispute.conciliator && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
              <p className="mt-1 font-medium">{dispute.conciliator.name}</p>
              <p className="text-sm text-muted-foreground">{dispute.conciliator.email}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="mt-1 text-sm">{format(new Date(dispute.createdAt), 'PPp')}</p>
            </div>

            {dispute.assignedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Assigned</label>
                <p className="mt-1 text-sm">{format(new Date(dispute.assignedAt), 'PPp')}</p>
              </div>
            )}
          </div>

          {dispute.resolvedAt && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Resolved</label>
              <p className="mt-1 text-sm">{format(new Date(dispute.resolvedAt), 'PPp')}</p>
            </div>
          )}

          {dispute.resolution && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Resolution</label>
              <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{dispute.resolution}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
