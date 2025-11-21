'use client';

import { format } from 'date-fns';
import { MessageSquare, AlertCircle, UserCheck, CheckCircle, Lock } from 'lucide-react';
import { Dispute, DisputeMessage } from '@/types/conciliator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';

interface DisputeTimelineProps {
  dispute: Dispute;
  messages?: DisputeMessage[];
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'message' | 'assigned' | 'resolved';
  timestamp: string;
  title: string;
  description?: string;
  user?: {
    name: string;
    role: string;
  };
  isInternal?: boolean;
}

export function DisputeTimeline({ dispute, messages = [] }: DisputeTimelineProps) {
  const events: TimelineEvent[] = [];

  // Disputa creada
  const creatorName = dispute.openedBy === 'seller'
    ? (dispute.seller?.name || dispute.seller?.email || 'Unknown')
    : (dispute.provider?.name || dispute.provider?.email || 'Unknown');

  events.push({
    id: `created-${dispute.id}`,
    type: 'created',
    timestamp: dispute.createdAt,
    title: 'Dispute Opened',
    description: `By ${creatorName}`,
    user: {
      name: creatorName,
      role: dispute.openedBy,
    },
  });

  // Mensajes
  messages.forEach((message) => {
    events.push({
      id: message.id,
      type: 'message',
      timestamp: message.createdAt,
      title: message.isInternal ? 'Internal Note' : 'Message',
      description: message.message,
      user: message.sender ? {
        name: message.sender.name || 'Unknown',
        role: message.sender.role || 'user',
      } : undefined,
      isInternal: message.isInternal,
    });
  });

  // Asignada a conciliator
  if (dispute.assignedAt && dispute.conciliator) {
    const conciliatorName = dispute.conciliator.name || 'Unknown';
    events.push({
      id: `assigned-${dispute.id}`,
      type: 'assigned',
      timestamp: dispute.assignedAt,
      title: 'Assigned to Conciliator',
      description: conciliatorName,
      user: {
        name: conciliatorName,
        role: 'conciliator',
      },
    });
  }

  // Resuelta
  if (dispute.resolvedAt && dispute.resolutionType) {
    events.push({
      id: `resolved-${dispute.id}`,
      type: 'resolved',
      timestamp: dispute.resolvedAt,
      title: 'Dispute Resolved',
      description: dispute.resolution,
      user: dispute.conciliator ? {
        name: dispute.conciliator.name || dispute.conciliator.email || 'Unknown',
        role: 'conciliator',
      } : undefined,
    });
  }

  // Ordenar por timestamp
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getEventIcon = (type: TimelineEvent['type'], isInternal?: boolean) => {
    if (isInternal) return <Lock className="h-4 w-4 text-yellow-600" />;

    switch (type) {
      case 'created':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'assigned':
        return <UserCheck className="h-4 w-4 text-purple-600" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <Avatar className="h-8 w-8">
              <AvatarFallback className={event.isInternal ? 'bg-yellow-100 text-yellow-800' : ''}>
                {event.user ? getInitials(event.user.name) : getEventIcon(event.type, event.isInternal)}
              </AvatarFallback>
            </Avatar>
            {index < events.length - 1 && (
              <div className="mt-2 h-full w-0.5 bg-border" />
            )}
          </div>

          <Card className={`flex-1 p-4 ${event.isInternal ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {getEventIcon(event.type, event.isInternal)}
                <h4 className="font-semibold text-sm">{event.title}</h4>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm')}
              </span>
            </div>

            {event.user && (
              <p className="mt-1 text-sm text-muted-foreground">
                {event.user.name} ({event.user.role})
              </p>
            )}

            {event.description && (
              <p className="mt-2 text-sm whitespace-pre-wrap">{event.description}</p>
            )}

            {event.isInternal && (
              <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-400">
                <Lock className="inline h-3 w-3 mr-1" />
                Only visible to conciliators
              </p>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
}
