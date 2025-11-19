'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { Dispute, SLAStatus } from '@/types/conciliator';
import { getSLAStatus, getSLAColor, getSLAText, getTimeSinceCreated, getTimeSinceAssigned } from '@/lib/utils/conciliator';

interface SLAIndicatorProps {
  dispute: Dispute;
  showTime?: boolean;
}

export function SLAIndicator({ dispute, showTime = true }: SLAIndicatorProps) {
  const [slaStatus, setSlaStatus] = useState<SLAStatus>(getSLAStatus(dispute));
  const [timeDisplay, setTimeDisplay] = useState<string>('');

  // Actualizar cada minuto para reflejar cambios en tiempo real
  useEffect(() => {
    const updateSLA = () => {
      setSlaStatus(getSLAStatus(dispute));

      if (showTime) {
        if (dispute.status === 'open') {
          setTimeDisplay(getTimeSinceCreated(dispute.createdAt));
        } else if (dispute.status === 'under_review' && dispute.assignedAt) {
          setTimeDisplay(getTimeSinceAssigned(dispute.assignedAt) || '');
        }
      }
    };

    updateSLA();
    const interval = setInterval(updateSLA, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [dispute, showTime]);

  if (dispute.status === 'resolved' || dispute.status === 'closed') {
    return null; // No mostrar SLA para disputas ya resueltas
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={getSLAColor(slaStatus)} variant="outline">
        <Clock className="mr-1 h-3 w-3" />
        {getSLAText(slaStatus)}
      </Badge>
      {showTime && timeDisplay && (
        <span className="text-sm text-muted-foreground">
          {timeDisplay}
        </span>
      )}
    </div>
  );
}
