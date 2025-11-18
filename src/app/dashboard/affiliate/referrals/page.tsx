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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Eye, Search, Filter } from 'lucide-react';
import { useReferrals } from '@/lib/hooks';
import { ReferralFilters } from '@/types/affiliate';
import {
  ReferralStatusBadge,
  ReferralDetailsDialog,
} from '@/components/affiliate';
import { formatCommissionAmount } from '@/lib/utils/affiliate';

export default function ReferralsPage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<ReferralFilters>({
    page: 1,
    limit: 10,
  });
  const [selectedReferralId, setSelectedReferralId] = useState<string>('');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { data, isLoading } = useReferrals(filters);

  const handleSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }));
  };

  const handleStatusFilter = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: status === 'all' ? undefined : (status as any),
      page: 1,
    }));
  };

  const handleRoleFilter = (role: string) => {
    setFilters((prev) => ({
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
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const totalReferrals = data?.pagination.total || 0;
  const activeReferrals = data?.data.filter((r: any) => r.status === 'active').length || 0;
  const inactiveReferrals = data?.data.filter((r: any) => r.status === 'inactive').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('affiliate.referrals.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('affiliate.referrals.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('affiliate.referrals.totalReferrals')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalReferrals}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('affiliate.referrals.active')}</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{activeReferrals}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('affiliate.referrals.inactive')}</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-gray-500">{inactiveReferrals}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('affiliate.referrals.thisMonth')}</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {data?.data.filter((r: any) => {
                  const createdDate = new Date(r.createdAt);
                  const now = new Date();
                  return (
                    createdDate.getMonth() === now.getMonth() &&
                    createdDate.getFullYear() === now.getFullYear()
                  );
                }).length || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('affiliate.referrals.allReferrals')}</CardTitle>
          <CardDescription>{t('affiliate.referrals.completeList')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('affiliate.referrals.searchPlaceholder')}
                className="pl-10"
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Select
              defaultValue="all"
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
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
            <Select
              defaultValue="all"
              onValueChange={handleRoleFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={t('affiliate.role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('affiliate.referrals.allRoles')}</SelectItem>
                <SelectItem value="admin">{t('affiliate.referrals.admin')}</SelectItem>
                <SelectItem value="provider">{t('affiliate.referrals.provider')}</SelectItem>
                <SelectItem value="seller">{t('affiliate.referrals.seller')}</SelectItem>
                <SelectItem value="affiliate">{t('affiliate.referrals.affiliate')}</SelectItem>
                <SelectItem value="conciliator">{t('affiliate.referrals.conciliator')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data && data.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('affiliate.referrals.user')}</TableHead>
                      <TableHead>{t('affiliate.referrals.role')}</TableHead>
                      <TableHead>{t('affiliate.referrals.status')}</TableHead>
                      <TableHead>{t('affiliate.referrals.registered')}</TableHead>
                      <TableHead className="text-right">{t('affiliate.referrals.commissionEarned')}</TableHead>
                      <TableHead className="text-right">{t('affiliate.referrals.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((referral: any) => (
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
                          <ReferralStatusBadge status={referral.status} />
                        </TableCell>
                        <TableCell>
                          {format(new Date(referral.createdAt), 'PP')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCommissionAmount(referral.totalCommissionEarned)}
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
              {data?.pagination?.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('affiliate.referrals.page')} {data.pagination.page} {t('affiliate.referrals.of')} {data.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page! - 1)}
                      disabled={filters.page === 1}
                    >
                      {t('affiliate.referrals.previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page! + 1)}
                      disabled={filters.page === data?.pagination?.totalPages}
                    >
                      {t('affiliate.referrals.next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {t('affiliate.referrals.noReferrals')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <ReferralDetailsDialog
        referralId={selectedReferralId}
        isOpen={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
      />
    </div>
  );
}
