import {
  getSLAStatus,
  calculateResolutionTime,
  formatResolutionTime,
  getTimeSinceCreated,
  getTimeSinceAssigned,
  getSLAColor,
  getSLAText,
} from '../conciliator';
import { Dispute } from '@/types/conciliator';

describe('Conciliator Utils', () => {
  describe('getSLAStatus', () => {
    it('should return on_time for open dispute created less than 30 minutes ago', () => {
      const now = new Date();
      const created = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago

      const dispute = {
        status: 'open',
        createdAt: created.toISOString(),
      } as Dispute;

      expect(getSLAStatus(dispute)).toBe('on_time');
    });

    it('should return overdue for open dispute created more than 30 minutes ago', () => {
      const now = new Date();
      const created = new Date(now.getTime() - 45 * 60 * 1000); // 45 minutes ago

      const dispute = {
        status: 'open',
        createdAt: created.toISOString(),
      } as Dispute;

      expect(getSLAStatus(dispute)).toBe('overdue');
    });

    it('should return on_time for under_review dispute assigned less than 24 hours ago', () => {
      const now = new Date();
      const assigned = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

      const dispute = {
        status: 'under_review',
        createdAt: new Date().toISOString(),
        assignedAt: assigned.toISOString(),
      } as Dispute;

      expect(getSLAStatus(dispute)).toBe('on_time');
    });

    it('should return warning for under_review dispute assigned between 24-48 hours ago', () => {
      const now = new Date();
      const assigned = new Date(now.getTime() - 36 * 60 * 60 * 1000); // 36 hours ago

      const dispute = {
        status: 'under_review',
        createdAt: new Date().toISOString(),
        assignedAt: assigned.toISOString(),
      } as Dispute;

      expect(getSLAStatus(dispute)).toBe('warning');
    });

    it('should return overdue for under_review dispute assigned more than 48 hours ago', () => {
      const now = new Date();
      const assigned = new Date(now.getTime() - 50 * 60 * 60 * 1000); // 50 hours ago

      const dispute = {
        status: 'under_review',
        createdAt: new Date().toISOString(),
        assignedAt: assigned.toISOString(),
      } as Dispute;

      expect(getSLAStatus(dispute)).toBe('overdue');
    });
  });

  describe('calculateResolutionTime', () => {
    it('should calculate resolution time correctly', () => {
      const assigned = new Date('2024-01-01T10:00:00Z');
      const resolved = new Date('2024-01-01T14:00:00Z');

      const dispute = {
        assignedAt: assigned.toISOString(),
        resolvedAt: resolved.toISOString(),
      } as Dispute;

      const time = calculateResolutionTime(dispute);
      expect(time).toBe(4); // 4 hours
    });

    it('should return null if assignedAt is missing', () => {
      const dispute = {
        resolvedAt: new Date().toISOString(),
      } as Dispute;

      expect(calculateResolutionTime(dispute)).toBeNull();
    });

    it('should return null if resolvedAt is missing', () => {
      const dispute = {
        assignedAt: new Date().toISOString(),
      } as Dispute;

      expect(calculateResolutionTime(dispute)).toBeNull();
    });
  });

  describe('formatResolutionTime', () => {
    it('should format time less than 1 hour in minutes', () => {
      expect(formatResolutionTime(0.5)).toBe('30 min');
      expect(formatResolutionTime(0.75)).toBe('45 min');
    });

    it('should format time less than 24 hours in hours', () => {
      expect(formatResolutionTime(2)).toBe('2.0 hrs');
      expect(formatResolutionTime(12.5)).toBe('12.5 hrs');
    });

    it('should format time 24 hours or more in days', () => {
      expect(formatResolutionTime(24)).toBe('1.0 days');
      expect(formatResolutionTime(48)).toBe('2.0 days');
    });
  });

  describe('getTimeSinceCreated', () => {
    it('should return time in minutes if less than 1 hour', () => {
      const now = new Date();
      const created = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

      const result = getTimeSinceCreated(created.toISOString());
      expect(result).toBe('30m');
    });

    it('should return time in hours and minutes if less than 1 day', () => {
      const now = new Date();
      const created = new Date(now.getTime() - 150 * 60 * 1000); // 2.5 hours ago

      const result = getTimeSinceCreated(created.toISOString());
      expect(result).toBe('2h 30m');
    });

    it('should return time in days and hours if 1 day or more', () => {
      const now = new Date();
      const created = new Date(now.getTime() - 26 * 60 * 60 * 1000); // 26 hours ago

      const result = getTimeSinceCreated(created.toISOString());
      expect(result).toBe('1d 2h');
    });
  });

  describe('getTimeSinceAssigned', () => {
    it('should return null if assignedAt is undefined', () => {
      expect(getTimeSinceAssigned(undefined)).toBeNull();
    });

    it('should return time since assigned', () => {
      const now = new Date();
      const assigned = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

      const result = getTimeSinceAssigned(assigned.toISOString());
      expect(result).toBe('2h 0m');
    });
  });

  describe('getSLAColor', () => {
    it('should return correct color for on_time', () => {
      const color = getSLAColor('on_time');
      expect(color).toContain('green');
    });

    it('should return correct color for warning', () => {
      const color = getSLAColor('warning');
      expect(color).toContain('yellow');
    });

    it('should return correct color for overdue', () => {
      const color = getSLAColor('overdue');
      expect(color).toContain('red');
    });
  });

  describe('getSLAText', () => {
    it('should return correct text for each status', () => {
      expect(getSLAText('on_time')).toBe('On Time');
      expect(getSLAText('warning')).toBe('Warning');
      expect(getSLAText('overdue')).toBe('Overdue');
    });
  });
});
