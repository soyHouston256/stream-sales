'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    CheckCircle,
    XCircle,
    Clock,
    Users,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { tokenManager } from '@/lib/utils/tokenManager';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import { EmptyState } from '@/components/ui/empty-state';

interface ProviderProfile {
    id: string;
    userId: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
    status: string;
    applicationNote?: string;
    createdAt: string;
}

export default function AdminProvidersPage() {
    const { t } = useLanguage();
    const [profiles, setProfiles] = useState<ProviderProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<ProviderProfile | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchProfiles = useCallback(async () => {
        try {
            setIsLoading(true);
            const token = tokenManager.getToken();

            const response = await fetch('/api/admin/providers', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(t('admin.providers.fetchError'));
            }

            const data = await response.json();
            setProfiles(data.data || []);
        } catch (err: any) {
            console.error('Error fetching profiles:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const handleApprove = async () => {
        if (!selectedProfile) return;

        try {
            setIsSubmitting(true);
            const token = tokenManager.getToken();

            const response = await fetch(`/api/admin/providers/${selectedProfile.id}/approve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(t('admin.providers.approveError'));
            }

            // Refresh profiles
            await fetchProfiles();
            setSelectedProfile(null);
            setActionType(null);
        } catch (err: any) {
            console.error('Error approving provider:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!selectedProfile || !rejectionReason.trim()) {
            setError(t('admin.providers.reasonRequired'));
            return;
        }

        try {
            setIsSubmitting(true);
            const token = tokenManager.getToken();

            const response = await fetch(`/api/admin/providers/${selectedProfile.id}/reject`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rejectionReason }),
            });

            if (!response.ok) {
                throw new Error(t('admin.providers.rejectError'));
            }

            // Refresh profiles
            await fetchProfiles();
            setSelectedProfile(null);
            setActionType(null);
            setRejectionReason('');
        } catch (err: any) {
            console.error('Error rejecting provider:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; icon: any; label: string }> = {
            pending: { variant: 'secondary', icon: Clock, label: t('admin.providers.pending') },
            approved: { variant: 'default', icon: CheckCircle, label: t('admin.providers.approved') },
            rejected: { variant: 'destructive', icon: XCircle, label: t('admin.providers.rejected') },
            active: { variant: 'default', icon: CheckCircle, label: t('admin.providers.active') },
        };

        // eslint-disable-next-line security/detect-object-injection
        const config = variants[status] || variants.pending;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const pendingCount = profiles.filter(p => p.status === 'pending').length;
    const approvedCount = profiles.filter(p => p.status === 'approved').length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('admin.providers.title')}</h1>
                    <p className="text-muted-foreground mt-2">
                        {t('admin.providers.subtitle')}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <EnhancedStatsCard
                    title={t('admin.providers.pendingRequests')}
                    value={pendingCount}
                    description={t('admin.providers.waitingReview')}
                    icon={Clock}
                    variant="warning"
                    isLoading={isLoading}
                />

                <EnhancedStatsCard
                    title={t('admin.providers.approvedProviders')}
                    value={approvedCount}
                    description={t('admin.providers.activePlatform')}
                    icon={CheckCircle}
                    variant="success"
                    isLoading={isLoading}
                />

                <EnhancedStatsCard
                    title={t('admin.providers.totalRequests')}
                    value={profiles.length}
                    description={t('admin.providers.historic')}
                    icon={Users}
                    variant="info"
                    isLoading={isLoading}
                />
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Profiles Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.providers.requestsList')}</CardTitle>
                    <CardDescription>
                        {t('admin.providers.requestsListDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {profiles.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title={t('admin.providers.noRequests')}
                            description={t('admin.providers.noRequestsDesc')}
                            variant="default"
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.providers.name')}</TableHead>
                                    <TableHead>{t('admin.providers.email')}</TableHead>
                                    <TableHead>{t('admin.providers.status')}</TableHead>
                                    <TableHead>{t('admin.providers.registeredAt')}</TableHead>
                                    <TableHead>{t('admin.providers.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {profiles.map((profile) => (
                                    <TableRow key={profile.id}>
                                        <TableCell className="font-medium">{profile.user.name || 'Sin nombre'}</TableCell>
                                        <TableCell>{profile.user.email}</TableCell>
                                        <TableCell>{getStatusBadge(profile.status)}</TableCell>
                                        <TableCell>
                                            {new Date(profile.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {profile.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => {
                                                                setSelectedProfile(profile);
                                                                setActionType('approve');
                                                            }}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                            {t('admin.providers.approve')}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => {
                                                                setSelectedProfile(profile);
                                                                setActionType('reject');
                                                            }}
                                                        >
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            {t('admin.providers.reject')}
                                                        </Button>
                                                    </>
                                                )}
                                                {profile.status !== 'pending' && (
                                                    <span className="text-sm text-muted-foreground italic">
                                                        {profile.status === 'approved' ? t('admin.providers.approved') : t('admin.providers.rejected')}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Approve Dialog */}
            <Dialog
                open={actionType === 'approve'}
                onOpenChange={(open) => {
                    if (!open) {
                        setActionType(null);
                        setSelectedProfile(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.providers.approveTitle')}</DialogTitle>
                        <DialogDescription
                            dangerouslySetInnerHTML={{
                                __html: t('admin.providers.approveDesc').replace('{name}', selectedProfile?.user.name || '')
                            }}
                        />
                    </DialogHeader>

                    {selectedProfile?.applicationNote && (
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                            <p className="text-sm font-medium">{t('admin.providers.applicationNote')}</p>
                            <p className="text-sm text-muted-foreground">{selectedProfile.applicationNote}</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setActionType(null);
                                setSelectedProfile(null);
                            }}
                            disabled={isSubmitting}
                        >
                            {t('admin.providers.cancel')}
                        </Button>
                        <Button onClick={handleApprove} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t('admin.providers.approving')}
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {t('admin.providers.confirmApprove')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog
                open={actionType === 'reject'}
                onOpenChange={(open) => {
                    if (!open) {
                        setActionType(null);
                        setSelectedProfile(null);
                        setRejectionReason('');
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.providers.rejectTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.providers.rejectDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {selectedProfile?.applicationNote && (
                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <p className="text-sm font-medium">{t('admin.providers.applicationNote')}</p>
                                <p className="text-sm text-muted-foreground">
                                    {selectedProfile?.applicationNote}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="rejection">{t('admin.providers.rejectReason')}</Label>
                            <Textarea
                                id="rejection"
                                placeholder={t('admin.providers.rejectPlaceholder')}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={4}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setActionType(null);
                                setSelectedProfile(null);
                                setRejectionReason('');
                            }}
                            disabled={isSubmitting}
                        >
                            {t('admin.providers.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={isSubmitting || !rejectionReason.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t('admin.providers.rejecting')}
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {t('admin.providers.confirmReject')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
