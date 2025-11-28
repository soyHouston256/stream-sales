import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface ReferralApprovalStatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected';
  className?: string;
}

/**
 * ReferralApprovalStatusBadge
 *
 * Displays a visual badge for referral approval status with appropriate colors and icons.
 *
 * @example
 * <ReferralApprovalStatusBadge status="pending" />
 * <ReferralApprovalStatusBadge status="approved" />
 * <ReferralApprovalStatusBadge status="rejected" />
 */
export function ReferralApprovalStatusBadge({
  status,
  className,
}: ReferralApprovalStatusBadgeProps) {
  const config = {
    pending: {
      label: 'Pendiente',
      variant: 'secondary' as const,
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    approved: {
      label: 'Aprobado',
      variant: 'default' as const,
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    rejected: {
      label: 'Rechazado',
      variant: 'destructive' as const,
      icon: XCircle,
      className: 'bg-red-100 text-red-800 border-red-300',
    },
  };

  // Fallback to pending if status is invalid or undefined
  const currentStatus = status && config[status] ? status : 'pending';
  const { label, icon: Icon, className: statusClassName } = config[currentStatus];

  return (
    <Badge className={`${statusClassName} ${className || ''}`}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}
