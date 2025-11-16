'use client';

import { useState } from 'react';
import { format } from 'date-fns';
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
        <h1 className="text-3xl font-bold">Referrals Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage and track all your referrals
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
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
            <CardTitle className="text-sm font-medium">Active</CardTitle>
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
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
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
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
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
          <CardTitle>All Referrals</CardTitle>
          <CardDescription>Complete list of users you have referred</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
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
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select
              defaultValue="all"
              onValueChange={handleRoleFilter}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="seller">Seller</SelectItem>
                <SelectItem value="affiliate">Affiliate</SelectItem>
                <SelectItem value="conciliator">Conciliator</SelectItem>
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
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Commission Earned</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page! - 1)}
                      disabled={filters.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page! + 1)}
                      disabled={filters.page === data.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No referrals found. Try adjusting your filters.
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
