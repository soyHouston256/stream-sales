'use client';

import { format } from 'date-fns';
import { Eye, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dispute } from '@/types/conciliator';
import { DisputeStatusBadge } from './DisputeStatusBadge';
import { SLAIndicator } from './SLAIndicator';
import { useAssignDispute } from '@/lib/hooks/useDisputes';

interface DisputesTableProps {
  disputes: Dispute[];
  showAssignButton?: boolean;
  showConciliator?: boolean;
}

export function DisputesTable({ disputes, showAssignButton = false, showConciliator = true }: DisputesTableProps) {
  const assignDispute = useAssignDispute();

  const handleAssign = async (disputeId: string) => {
    await assignDispute.mutateAsync(disputeId);
  };

  if (disputes.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No disputes found
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dispute ID</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Opened By</TableHead>
            <TableHead>Seller</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Status</TableHead>
            {showConciliator && <TableHead>Assigned To</TableHead>}
            <TableHead>Created</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {disputes.map((dispute) => (
            <TableRow key={dispute.id}>
              <TableCell className="font-mono text-xs">
                {dispute.id.slice(0, 8)}...
              </TableCell>
              <TableCell>
                <div>
                  <Badge variant="outline" className="mb-1">
                    {dispute.purchase.product.category}
                  </Badge>
                  <p className="text-sm font-medium">{dispute.purchase.product.name}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={dispute.openedBy === 'seller' ? 'default' : 'secondary'}>
                  {dispute.openedBy === 'seller' ? 'Seller' : 'Provider'}
                </Badge>
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm font-medium">{dispute.seller.name}</p>
                  <p className="text-xs text-muted-foreground">{dispute.seller.email}</p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm font-medium">{dispute.provider.name}</p>
                  <p className="text-xs text-muted-foreground">{dispute.provider.email}</p>
                </div>
              </TableCell>
              <TableCell>
                <DisputeStatusBadge status={dispute.status} />
              </TableCell>
              {showConciliator && (
                <TableCell>
                  {dispute.conciliator ? (
                    <div>
                      <p className="text-sm font-medium">{dispute.conciliator.name}</p>
                      <p className="text-xs text-muted-foreground">{dispute.conciliator.email}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
              )}
              <TableCell>
                <p className="text-sm">{format(new Date(dispute.createdAt), 'MMM d, yyyy')}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(dispute.createdAt), 'HH:mm')}
                </p>
              </TableCell>
              <TableCell>
                <SLAIndicator dispute={dispute} showTime={false} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {showAssignButton && dispute.status === 'open' && !dispute.conciliatorId && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleAssign(dispute.id)}
                      disabled={assignDispute.isPending}
                    >
                      <UserCheck className="mr-1 h-3 w-3" />
                      Take
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/conciliator/disputes/${dispute.id}`}>
                      <Eye className="mr-1 h-3 w-3" />
                      {dispute.status === 'under_review' ? 'Review' : 'Details'}
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
