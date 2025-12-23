'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    CheckCircle,
    Users,
    Loader2,
    AlertCircle,
    UserPlus
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
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';

interface User {
    id: string;
    name: string;
    email: string;
    username?: string;
    role: string;
    phoneNumber?: string;
    countryCode?: string;
    createdAt: string;
}

interface ActiveDistributor {
    id: string;
    userId: string;
    referralCode: string;
    status: string;
    approvedAt?: string;
    user: User;
}

interface DistributorData {
    eligibleUsers: User[];
    pendingApplications: ActiveDistributor[];
    currentDistributors: ActiveDistributor[];
    stats: {
        eligibleCount: number;
        pendingCount: number;
        distributorCount: number;
    };
}

export default function AdminDistributorsPage() {
    const { t } = useLanguage();
    const [data, setData] = useState<DistributorData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const token = tokenManager.getToken();

            const response = await fetch('/api/admin/distributors/eligible', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(t('admin.distributors.fetchError'));
            }

            const result = await response.json();
            setData(result.data);
        } catch (err: any) {
            console.error('Error fetching distributor data:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApprove = async () => {
        if (!selectedUser) return;

        try {
            setIsSubmitting(true);
            const token = tokenManager.getToken();

            const response = await fetch('/api/admin/distributors/approve', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: selectedUser.id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || t('admin.distributors.approveError'));
            }

            // Refresh data
            await fetchData();
            setShowApproveDialog(false);
            setSelectedUser(null);
        } catch (err: any) {
            console.error('Error approving distributor:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRoleBadge = (role: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            user: { variant: 'secondary', label: t('admin.distributors.userRole') },
            seller: { variant: 'default', label: t('admin.distributors.sellerRole') },
            affiliate: { variant: 'outline', label: t('admin.distributors.affiliateRole') },
        };

        // eslint-disable-next-line security/detect-object-injection
        const config = variants[role] || variants.user;

        return (
            <Badge variant={config.variant}>
                {config.label}
            </Badge>
        );
    };

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
                    <h1 className="text-3xl font-bold tracking-tight">{t('admin.distributors.title')}</h1>
                    <p className="text-muted-foreground mt-2">
                        {t('admin.distributors.subtitle')}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    label={t('admin.distributors.pendingApplications')}
                    value={data?.stats.pendingCount || 0}
                    description={t('admin.distributors.pendingDesc')}
                    icon={AlertCircle}
                    color="orange"
                    isLoading={isLoading}
                />

                <StatCard
                    label={t('admin.distributors.eligibleUsers')}
                    value={data?.stats.eligibleCount || 0}
                    description={t('admin.distributors.eligibleDesc')}
                    icon={UserPlus}
                    color="blue"
                    isLoading={isLoading}
                />

                <StatCard
                    label={t('admin.distributors.activeDistributors')}
                    value={data?.stats.distributorCount || 0}
                    description={t('admin.distributors.activeDesc')}
                    icon={CheckCircle}
                    color="green"
                    isLoading={isLoading}
                />
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Pending Applications Table */}
            {data && data.pendingApplications && data.pendingApplications.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                            {t('admin.distributors.pendingApplications')}
                        </CardTitle>
                        <CardDescription>
                            {t('admin.distributors.pendingApplicationsDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.distributors.name')}</TableHead>
                                    <TableHead>{t('admin.distributors.email')}</TableHead>
                                    <TableHead>{t('admin.distributors.referralCode')}</TableHead>
                                    <TableHead>{t('admin.distributors.appliedAt')}</TableHead>
                                    <TableHead>{t('admin.distributors.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.pendingApplications.map((application) => (
                                    <TableRow key={application.id}>
                                        <TableCell className="font-medium">
                                            {application.user.name || 'Sin nombre'}
                                        </TableCell>
                                        <TableCell>{application.user.email}</TableCell>
                                        <TableCell>
                                            <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                                                {application.referralCode}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(application.user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedUser(application.user);
                                                    setShowApproveDialog(true);
                                                }}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                {t('admin.distributors.approveApplication')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Eligible Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.distributors.eligibleUsers')}</CardTitle>
                    <CardDescription>
                        {t('admin.distributors.eligibleUsersDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!data?.eligibleUsers.length ? (
                        <EmptyState
                            icon={Users}
                            title={t('admin.distributors.noEligible')}
                            description={t('admin.distributors.noEligibleDesc')}
                            variant="default"
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.distributors.name')}</TableHead>
                                    <TableHead>{t('admin.distributors.email')}</TableHead>
                                    <TableHead>{t('admin.distributors.role')}</TableHead>
                                    <TableHead>{t('admin.distributors.registered')}</TableHead>
                                    <TableHead>{t('admin.distributors.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.eligibleUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name || 'Sin nombre'}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowApproveDialog(true);
                                                }}
                                            >
                                                <UserPlus className="h-4 w-4 mr-1" />
                                                {t('admin.distributors.approveUser')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Active Distributors Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.distributors.activeDistributors')}</CardTitle>
                    <CardDescription>
                        {t('admin.distributors.activeDistributorsDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!data?.currentDistributors.length ? (
                        <EmptyState
                            icon={Users}
                            title={t('admin.distributors.noDistributors')}
                            description={t('admin.distributors.noDistributorsDesc')}
                            variant="default"
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.distributors.name')}</TableHead>
                                    <TableHead>{t('admin.distributors.email')}</TableHead>
                                    <TableHead>{t('admin.distributors.referralCode')}</TableHead>
                                    <TableHead>{t('admin.distributors.approvedAt')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.currentDistributors.map((distributor) => (
                                    <TableRow key={distributor.id}>
                                        <TableCell className="font-medium">
                                            {distributor.user.name || 'Sin nombre'}
                                        </TableCell>
                                        <TableCell>{distributor.user.email}</TableCell>
                                        <TableCell>
                                            <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                                                {distributor.referralCode}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            {distributor.approvedAt
                                                ? new Date(distributor.approvedAt).toLocaleDateString()
                                                : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.distributors.approveTitle')}</DialogTitle>
                        <DialogDescription
                            dangerouslySetInnerHTML={{
                                __html: t('admin.distributors.approveDesc').replace('{name}', selectedUser?.name || selectedUser?.email || '')
                            }}
                        />
                    </DialogHeader>

                    <div className="bg-muted p-4 rounded-lg space-y-3">
                        <p className="text-sm font-semibold border-b border-border pb-2">{t('admin.distributors.userInfo')}</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-muted-foreground text-xs mb-1">{t('admin.distributors.name')}</p>
                                <p className="font-medium">{selectedUser?.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs mb-1">{t('admin.distributors.email')}</p>
                                <p className="font-medium break-all">{selectedUser?.email}</p>
                            </div>
                            {selectedUser?.username && (
                                <div>
                                    <p className="text-muted-foreground text-xs mb-1">{t('admin.distributors.username')}</p>
                                    <p className="font-medium">@{selectedUser.username}</p>
                                </div>
                            )}
                            {selectedUser?.phoneNumber && (
                                <div>
                                    <p className="text-muted-foreground text-xs mb-1">{t('admin.distributors.phone')}</p>
                                    <p className="font-medium">
                                        {selectedUser.countryCode ? `+${selectedUser.countryCode} ` : ''}
                                        {selectedUser.phoneNumber}
                                    </p>
                                </div>
                            )}
                            {selectedUser?.countryCode && (
                                <div>
                                    <p className="text-muted-foreground text-xs mb-1">{t('admin.distributors.country')}</p>
                                    <p className="font-medium">{selectedUser.countryCode}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-muted-foreground text-xs mb-1">{t('admin.distributors.role')}</p>
                                <div className="mt-1">
                                    {getRoleBadge(selectedUser?.role || 'user')}
                                </div>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs mb-1">{t('admin.distributors.registeredOn')}</p>
                                <p className="font-medium">
                                    {selectedUser?.createdAt
                                        ? new Date(selectedUser.createdAt).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })
                                        : '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowApproveDialog(false);
                                setSelectedUser(null);
                            }}
                            disabled={isSubmitting}
                        >
                            {t('admin.distributors.cancel')}
                        </Button>
                        <Button onClick={handleApprove} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t('admin.distributors.approving')}
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {t('admin.distributors.confirmApprove')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
