'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, Inbox } from 'lucide-react';
import { useConciliatorStats, useResolutionsByDay } from '@/lib/hooks/useConciliatorStats';
import { useDisputes } from '@/lib/hooks/useDisputes';
import { StatsCard } from '@/components/conciliator/StatsCard';
import { ResolutionsByDayChart } from '@/components/conciliator/ResolutionsByDayChart';
import { DisputesTable } from '@/components/conciliator/DisputesTable';
import { Skeleton } from '@/components/ui/skeleton';

export default function ConciliatorDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useConciliatorStats();
  const { data: resolutionsData, isLoading: resolutionsLoading } = useResolutionsByDay(30);
  const { data: pendingDisputes, isLoading: pendingLoading } = useDisputes({
    status: 'open',
    limit: 5,
  });
  const { data: myAssignedDisputes, isLoading: assignedLoading } = useDisputes({
    status: 'under_review',
    limit: 5,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conciliator Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome, {user?.name || user?.email}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32 mt-1" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : stats ? (
          <>
            <StatsCard
              title="Pending Disputes"
              value={stats.pendingDisputes}
              description="Awaiting assignment"
              icon={Inbox}
            />
            <StatsCard
              title="My Assigned"
              value={stats.myAssigned}
              description="Under review"
              icon={Clock}
            />
            <StatsCard
              title="Resolved Today"
              value={stats.resolvedToday}
              description="Completed today"
              icon={CheckCircle}
            />
            <StatsCard
              title="Total Resolved"
              value={stats.totalResolved}
              description="Lifetime"
              icon={CheckCircle}
            />
          </>
        ) : null}
      </div>

      {/* Overdue Alert */}
      {stats && stats.overdueDisputes > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Overdue Disputes
            </CardTitle>
            <CardDescription className="text-red-700 dark:text-red-400">
              {stats.overdueDisputes} dispute{stats.overdueDisputes > 1 ? 's have' : ' has'} exceeded the SLA deadline
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Resolutions Chart */}
      <div>
        {resolutionsLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ) : resolutionsData ? (
          <ResolutionsByDayChart data={resolutionsData} />
        ) : null}
      </div>

      {/* Pending Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Assignment</CardTitle>
          <CardDescription>
            Disputes waiting to be assigned (showing latest 5)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pendingDisputes && pendingDisputes.disputes.length > 0 ? (
            <DisputesTable
              disputes={pendingDisputes.disputes}
              showAssignButton={true}
              showConciliator={false}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending disputes. Great job!
            </p>
          )}
        </CardContent>
      </Card>

      {/* My Assigned Disputes */}
      <Card>
        <CardHeader>
          <CardTitle>My Assigned Disputes</CardTitle>
          <CardDescription>
            Disputes assigned to you for review (showing latest 5)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : myAssignedDisputes && myAssignedDisputes.disputes.length > 0 ? (
            <DisputesTable
              disputes={myAssignedDisputes.disputes}
              showAssignButton={false}
              showConciliator={false}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No assigned disputes at the moment
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
