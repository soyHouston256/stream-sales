import { Dispute, SLAStatus } from '@/types/conciliator';

/**
 * Calcular el estado del SLA de una disputa
 * - open: < 30 minutos = on_time, >= 30 minutos = overdue
 * - under_review: < 24 hrs = on_time, < 48 hrs = warning, >= 48 hrs = overdue
 */
export function getSLAStatus(dispute: Dispute): SLAStatus {
  const now = new Date();
  const created = new Date(dispute.createdAt);

  if (dispute.status === 'open') {
    // SLA: 30 minutos para asignar
    const minutesPassed = (now.getTime() - created.getTime()) / (1000 * 60);
    if (minutesPassed < 30) return 'on_time';
    return 'overdue';
  }

  if (dispute.status === 'under_review' && dispute.assignedAt) {
    // SLA: 24 horas para resolver desde asignación
    const assigned = new Date(dispute.assignedAt);
    const hoursPassed = (now.getTime() - assigned.getTime()) / (1000 * 60 * 60);
    if (hoursPassed < 24) return 'on_time';
    if (hoursPassed < 48) return 'warning';
    return 'overdue';
  }

  return 'on_time';
}

/**
 * Calcular el tiempo de resolución en horas
 * Retorna null si la disputa no ha sido asignada o resuelta
 */
export function calculateResolutionTime(dispute: Dispute): number | null {
  if (!dispute.assignedAt || !dispute.resolvedAt) return null;

  const assigned = new Date(dispute.assignedAt);
  const resolved = new Date(dispute.resolvedAt);

  return (resolved.getTime() - assigned.getTime()) / (1000 * 60 * 60); // hours
}

/**
 * Formatear tiempo de resolución a un string legible
 */
export function formatResolutionTime(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  return `${(hours / 24).toFixed(1)} days`;
}

/**
 * Calcular tiempo transcurrido desde creación
 */
export function getTimeSinceCreated(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

/**
 * Calcular tiempo transcurrido desde asignación
 */
export function getTimeSinceAssigned(assignedAt: string | undefined): string | null {
  if (!assignedAt) return null;

  const now = new Date();
  const assigned = new Date(assignedAt);
  const diffMs = now.getTime() - assigned.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

/**
 * Obtener el color del badge según el estado del SLA
 */
export function getSLAColor(status: SLAStatus): string {
  switch (status) {
    case 'on_time':
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950';
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950';
    case 'overdue':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
  }
}

/**
 * Obtener el texto del SLA
 */
export function getSLAText(status: SLAStatus): string {
  switch (status) {
    case 'on_time':
      return 'On Time';
    case 'warning':
      return 'Warning';
    case 'overdue':
      return 'Overdue';
  }
}
