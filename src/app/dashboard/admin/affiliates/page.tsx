'use client';

import { useEffect, useState } from 'react';
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

interface AffiliateApplication {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  referralCode: string;
  status: string;
  applicationNote: string;
  createdAt: string;
}

export default function AdminAffiliatesPage() {
  const { t } = useLanguage();
  const [applications, setApplications] = useState<AffiliateApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<AffiliateApplication | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const token = tokenManager.getToken();

      const response = await fetch('/api/admin/affiliate/applications', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.data || []);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async () => {
    if (!selectedApp) return;

    try {
      setIsSubmitting(true);
      const token = tokenManager.getToken();

      const response = await fetch(`/api/admin/affiliate/applications/${selectedApp.id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: 'bronze' }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve application');
      }

      // Refresh applications
      await fetchApplications();
      setSelectedApp(null);
      setActionType(null);
    } catch (err: any) {
      console.error('Error approving application:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = tokenManager.getToken();

      const response = await fetch(`/api/admin/affiliate/applications/${selectedApp.id}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejectionReason }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject application');
      }

      // Refresh applications
      await fetchApplications();
      setSelectedApp(null);
      setActionType(null);
      setRejectionReason('');
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: t('admin.affiliates.pending') },
      approved: { variant: 'default', icon: CheckCircle, label: t('admin.affiliates.approved') },
      rejected: { variant: 'destructive', icon: XCircle, label: t('admin.affiliates.rejected') },
      active: { variant: 'default', icon: CheckCircle, label: t('admin.affiliates.active') },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const pendingCount = applications.filter(app => app.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.affiliates.title')}</h1>
          <p className="text-muted-foreground">
            {t('admin.affiliates.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.affiliates.pendingApplications')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.affiliates.awaitingReview')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.affiliates.approved')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(app => app.status === 'approved').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('admin.affiliates.activeAffiliates')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.affiliates.totalApplications')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.affiliates.allTime')}
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.affiliates.allApplicationsTitle')}</CardTitle>
          <CardDescription>
            {t('admin.affiliates.allApplicationsSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('admin.affiliates.noApplications')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.affiliates.user')}</TableHead>
                  <TableHead>{t('admin.affiliates.email')}</TableHead>
                  <TableHead>{t('admin.affiliates.referralCode')}</TableHead>
                  <TableHead>{t('admin.affiliates.status')}</TableHead>
                  <TableHead>{t('admin.affiliates.applied')}</TableHead>
                  <TableHead>{t('admin.affiliates.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.user.name}</TableCell>
                    <TableCell>{app.user.email}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {app.referralCode}
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell>
                      {new Date(app.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {app.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedApp(app);
                                setActionType('approve');
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {t('admin.affiliates.approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedApp(app);
                                setActionType('reject');
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {t('admin.affiliates.reject')}
                            </Button>
                          </>
                        )}
                        {app.status !== 'pending' && (
                          <span className="text-sm text-muted-foreground">
                            {app.status === 'approved' ? t('admin.affiliates.approved') : t('admin.affiliates.rejected')}
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
            setSelectedApp(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.affiliates.approveTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.affiliates.approveDescription').replace('{name}', selectedApp?.user.name || '')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">{t('admin.affiliates.applicationNote')}</p>
              <p className="text-sm text-muted-foreground">
                {selectedApp?.applicationNote}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionType(null);
                setSelectedApp(null);
              }}
              disabled={isSubmitting}
            >
              {t('admin.affiliates.cancel')}
            </Button>
            <Button onClick={handleApprove} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('admin.affiliates.approving')}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('admin.affiliates.approve')}
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
            setSelectedApp(null);
            setRejectionReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.affiliates.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.affiliates.rejectDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">{t('admin.affiliates.applicationNote')}</p>
              <p className="text-sm text-muted-foreground">
                {selectedApp?.applicationNote}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejection">{t('admin.affiliates.rejectionReason')}</Label>
              <Textarea
                id="rejection"
                placeholder={t('admin.affiliates.rejectionPlaceholder')}
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
                setSelectedApp(null);
                setRejectionReason('');
              }}
              disabled={isSubmitting}
            >
              {t('admin.affiliates.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isSubmitting || !rejectionReason.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('admin.affiliates.rejecting')}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('admin.affiliates.reject')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
