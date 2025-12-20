'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Eye, Search, Filter, Clock, CheckCircle, XCircle, Wallet, Info, ShieldCheck } from 'lucide-react';
import { useReferrals } from '@/lib/hooks';
import { ReferralFilters, Referral } from '@/types/affiliate';
import {
  ReferralApprovalStatusBadge,
  ReferralDetailsDialog,
  ReferralApprovalDialog,
} from '@/components/affiliate';
import { useQuery } from '@tanstack/react-query';
import { tokenManager } from '@/lib/utils/tokenManager';

export default function ReferralsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('pending');

  // Filters for all referrals
  const [allFilters, setAllFilters] = useState<ReferralFilters>({
    page: 1,
    limit: 10,
  });

  // Filters for pending referrals
  const [pendingFilters] = useState<ReferralFilters>({
    page: 1,
    limit: 50,
    approvalStatus: 'pending',
  });

  // Dialog states
  const [selectedReferralId, setSelectedReferralId] = useState<string>('');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [approvalDialogMode, setApprovalDialogMode] = useState<'approve' | 'reject'>('approve');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

  // Fetch all referrals
  const { data: allData, isLoading: isLoadingAll } = useReferrals(allFilters);

  // Fetch pending referrals
  const { data: pendingData, isLoading: isLoadingPending } = useReferrals(pendingFilters);

  // Fetch approval fee configuration
  const { data: approvalFeeData } = useQuery({
    queryKey: ['referral-approval-fee'],
    queryFn: async () => {
      const token = tokenManager.getToken();
      const response = await fetch('/api/admin/settings/referral-fee', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return { data: { approvalFee: '0.00' } };
      return response.json();
    },
  });

  // Fetch affiliate wallet balance
  const { data: walletData } = useQuery({
    queryKey: ['affiliate-wallet-balance'],
    queryFn: async () => {
      const token = tokenManager.getToken();
      const response = await fetch('/api/affiliate/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch wallet balance');
      return response.json();
    },
  });

  const approvalFee = approvalFeeData?.data?.approvalFee || '0.00';
  const affiliateBalance = walletData?.balance || '0.00';
  const pendingReferrals = pendingData?.data || [];

  // Stats calculations
  const totalReferrals = allData?.pagination?.total || 0;
  const pendingCount = pendingReferrals.length;
  const approvedCount = allData?.data?.filter((r: any) => r.approvalStatus === 'approved').length || 0;
  const rejectedCount = allData?.data?.filter((r: any) => r.approvalStatus === 'rejected').length || 0;

  // Handlers for all referrals
  const handleSearch = (search: string) => {
    setAllFilters((prev) => ({ ...prev, search, page: 1 }));
  };

  const handleStatusFilter = (status: string) => {
    setAllFilters((prev) => ({
      ...prev,
      status: status === 'all' ? undefined : (status as any),
      page: 1,
    }));
  };

  const handleRoleFilter = (role: string) => {
    setAllFilters((prev) => ({
      ...prev,
      role: role === 'all' ? undefined : (role as any),
      page: 1,
    }));
  };

  const handleViewDetails = (referralId: string) => {
    setSelectedReferralId(referralId);
    setDetailsDialogOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    setAllFilters((prev) => ({ ...prev, page: newPage }));
  };

  // Handlers for pending referrals
  const handleApprove = (referral: Referral) => {
    setSelectedReferral(referral);
    setApprovalDialogMode('approve');
    setApprovalDialogOpen(true);
  };

  const handleReject = (referral: Referral) => {
    setSelectedReferral(referral);
    setApprovalDialogMode('reject');
    setApprovalDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{t('affiliate.referrals.title')}</h1>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <ShieldCheck size={14} className="mr-1" />
              Afiliado
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            {t('affiliate.referrals.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('affiliate.referrals.totalReferrals') || "Total Referidos"}
          value={totalReferrals}
          description={t('affiliate.referrals.registeredWithCode') || "Registrados con tu código"}
          icon={Users}
          color="blue"
          isLoading={isLoadingAll}
        />

        <StatCard
          label={t('affiliate.referrals.pendingApproval') || "Pendientes"}
          value={pendingCount}
          description={t('affiliate.referrals.waitingApproval') || "Esperando aprobación"}
          icon={Clock}
          color="orange"
          isLoading={isLoadingPending}
        />

        <StatCard
          label={t('affiliate.referrals.approved') || "Aprobados"}
          value={approvedCount}
          description={t('affiliate.referrals.activeSellers') || "Vendedores activos"}
          icon={CheckCircle}
          color="green"
          isLoading={isLoadingAll}
        />

        <StatCard
          label={t('affiliate.referrals.yourBalance') || "Tu Saldo"}
          value={`$${affiliateBalance}`}
          description={t('affiliate.referrals.availableForApprovals') || "Disponible para aprobaciones"}
          icon={Wallet}
          color="purple"
          isLoading={false}
        />
      </div>

      {/* Tabs for All/Pending */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            {t('affiliate.referrals.pendingTab') || "Pendientes"}
            {pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            {t('affiliate.referrals.allTab') || "Todos"}
          </TabsTrigger>
        </TabsList>

        {/* Pending Referrals Tab */}
        <TabsContent value="pending" className="space-y-4">
          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              <strong>{t('affiliate.pendingReferrals.howItWorksTitle') || "¿Cómo funciona?"}</strong>{' '}
              {(t('affiliate.pendingReferrals.howItWorksDescription') ||
                "Para aprobar un referido debes pagar una cuota de {fee} USD desde tu saldo de afiliado.").replace('{fee}', `$${approvalFee}`)}
            </AlertDescription>
          </Alert>

          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">{t('affiliate.pendingReferrals.waitingApproval') || "Esperando Aprobación"}</CardTitle>
              </div>
              <CardDescription>
                {t('affiliate.pendingReferrals.reviewDecide') || "Revisa y decide si aprobar o rechazar"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPending ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : pendingReferrals.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('affiliate.referrals.user')}</TableHead>
                        <TableHead>{t('affiliate.referrals.role')}</TableHead>
                        <TableHead>{t('affiliate.dashboard.registrationDate')}</TableHead>
                        <TableHead>{t('affiliate.dashboard.approvalStatus')}</TableHead>
                        <TableHead className="text-right">{t('affiliate.referrals.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingReferrals.map((referral: Referral) => (
                        <TableRow key={referral.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{referral.referredUser.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {referral.referredUser.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">{referral.referredUser.role}</span>
                          </TableCell>
                          <TableCell>{format(new Date(referral.createdAt), 'PPp')}</TableCell>
                          <TableCell>
                            <ReferralApprovalStatusBadge status={referral.approvalStatus} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="default"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => handleApprove(referral)}
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                {t('common.approve') || "Aprobar"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => handleReject(referral)}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                {t('common.reject') || "Rechazar"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title={t('affiliate.pendingReferrals.noPending') || "Sin pendientes"}
                  description={t('affiliate.pendingReferrals.allReviewed') || "Todos los referidos han sido revisados"}
                  variant="default"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Referrals Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">{t('affiliate.referrals.allReferrals')}</CardTitle>
              </div>
              <CardDescription>{t('affiliate.referrals.completeList')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('affiliate.referrals.searchPlaceholder')}
                    className="pl-10 rounded-xl"
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                <Select defaultValue="all" onValueChange={handleStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px] rounded-xl">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder={t('affiliate.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('affiliate.referrals.allStatus')}</SelectItem>
                    <SelectItem value="active">{t('affiliate.referrals.active')}</SelectItem>
                    <SelectItem value="inactive">{t('affiliate.referrals.inactive')}</SelectItem>
                    <SelectItem value="suspended">{t('affiliate.referrals.suspended')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all" onValueChange={handleRoleFilter}>
                  <SelectTrigger className="w-full md:w-[180px] rounded-xl">
                    <SelectValue placeholder={t('affiliate.role')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('affiliate.referrals.allRoles')}</SelectItem>
                    <SelectItem value="provider">{t('affiliate.referrals.provider')}</SelectItem>
                    <SelectItem value="seller">{t('affiliate.referrals.seller')}</SelectItem>
                    <SelectItem value="affiliate">{t('affiliate.referrals.affiliate')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              {isLoadingAll ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : allData && allData.data.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('affiliate.referrals.user')}</TableHead>
                          <TableHead>{t('affiliate.referrals.role')}</TableHead>
                          <TableHead>{t('affiliate.dashboard.approvalStatus')}</TableHead>
                          <TableHead>{t('affiliate.dashboard.registrationDate')}</TableHead>
                          <TableHead className="text-right">{t('affiliate.referrals.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allData.data.map((referral: any) => (
                          <TableRow key={referral.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{referral.referredUser.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {referral.referredUser.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="capitalize">{referral.referredUser.role}</span>
                            </TableCell>
                            <TableCell>
                              <ReferralApprovalStatusBadge status={referral.approvalStatus} />
                            </TableCell>
                            <TableCell>
                              {format(new Date(referral.createdAt), 'PP')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetails(referral.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {allData?.pagination?.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t('affiliate.referrals.page')} {allData.pagination.page} {t('affiliate.referrals.of')} {allData.pagination.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => handlePageChange(allFilters.page! - 1)}
                          disabled={allFilters.page === 1}
                        >
                          {t('affiliate.referrals.previous')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => handlePageChange(allFilters.page! + 1)}
                          disabled={allFilters.page === allData?.pagination?.totalPages}
                        >
                          {t('affiliate.referrals.next')}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={Users}
                  title={allFilters.search || allFilters.status || allFilters.role
                    ? t('affiliate.referrals.noReferralsFiltered')
                    : t('affiliate.referrals.noReferrals')}
                  description={
                    allFilters.search || allFilters.status || allFilters.role
                      ? t('affiliate.referrals.tryDifferentFilters')
                      : t('affiliate.referrals.startReferring')
                  }
                  variant={allFilters.search || allFilters.status || allFilters.role ? 'search' : 'default'}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <ReferralDetailsDialog
        referralId={selectedReferralId}
        isOpen={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
      />

      {/* Approval/Rejection Dialog */}
      <ReferralApprovalDialog
        referral={selectedReferral}
        approvalFee={approvalFee}
        affiliateBalance={affiliateBalance}
        isOpen={approvalDialogOpen}
        onClose={() => {
          setApprovalDialogOpen(false);
          setSelectedReferral(null);
        }}
        mode={approvalDialogMode}
      />
    </div>
  );
}
