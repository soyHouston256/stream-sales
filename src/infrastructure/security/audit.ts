/**
 * Audit Logging Utility for Credential Access
 * 
 * Tracks when users access sensitive credential information.
 * Critical for security compliance and incident investigation.
 */

import { prisma } from '@/infrastructure/database/prisma';

export interface CredentialAccessLog {
    userId: string;
    purchaseId: string;
    productId?: string;
    action: 'VIEW_CREDENTIALS' | 'DECRYPT_ATTEMPT' | 'DECRYPT_FAILED';
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

/**
 * Log a credential access event
 * 
 * @param log - The access log entry
 */
export async function logCredentialAccess(
    log: Omit<CredentialAccessLog, 'timestamp'>
): Promise<void> {
    const logEntry: CredentialAccessLog = {
        ...log,
        timestamp: new Date(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.log('[AUDIT] Credential Access:', JSON.stringify(logEntry, null, 2));
    }

    try {
        // Store in database for production audit trail
        await prisma.auditLog.create({
            data: {
                userId: logEntry.userId,
                action: logEntry.action,
                resourceType: 'PURCHASE_CREDENTIALS',
                resourceId: logEntry.purchaseId,
                ipAddress: logEntry.ipAddress,
                userAgent: logEntry.userAgent,
                metadata: logEntry.metadata ? JSON.stringify(logEntry.metadata) : null,
                createdAt: logEntry.timestamp,
            },
        });
    } catch (error) {
        // Don't fail the request if audit logging fails
        // But do log the error
        console.error('[AUDIT] Failed to log credential access:', error);
    }
}

/**
 * Get credential access history for a user
 * 
 * @param userId - The user to get history for
 * @param limit - Maximum number of entries
 */
export async function getCredentialAccessHistory(
    userId: string,
    limit: number = 50
): Promise<CredentialAccessLog[]> {
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                userId,
                resourceType: 'PURCHASE_CREDENTIALS',
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return logs.map((log: any) => ({
            userId: log.userId,
            purchaseId: log.resourceId,
            action: log.action as CredentialAccessLog['action'],
            ipAddress: log.ipAddress || undefined,
            userAgent: log.userAgent || undefined,
            timestamp: log.createdAt,
            metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
        }));
    } catch (error) {
        console.error('[AUDIT] Failed to get credential access history:', error);
        return [];
    }
}

/**
 * Check for suspicious access patterns
 * 
 * @param userId - The user to check
 * @returns Warning message if suspicious activity detected
 */
export async function checkSuspiciousActivity(
    userId: string
): Promise<string | null> {
    try {
        // Check for excessive access in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const recentAccess = await prisma.auditLog.count({
            where: {
                userId,
                resourceType: 'PURCHASE_CREDENTIALS',
                action: 'VIEW_CREDENTIALS',
                createdAt: { gte: oneHourAgo },
            },
        });

        if (recentAccess > 20) {
            return `High credential access frequency detected: ${recentAccess} accesses in last hour`;
        }

        // Check for failed decryption attempts
        const failedAttempts = await prisma.auditLog.count({
            where: {
                userId,
                resourceType: 'PURCHASE_CREDENTIALS',
                action: 'DECRYPT_FAILED',
                createdAt: { gte: oneHourAgo },
            },
        });

        if (failedAttempts > 5) {
            return `Multiple failed decryption attempts: ${failedAttempts} in last hour`;
        }

        return null;
    } catch (error) {
        console.error('[AUDIT] Failed to check suspicious activity:', error);
        return null;
    }
}
