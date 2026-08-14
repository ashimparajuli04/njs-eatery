'use client'
import { useState } from 'react'
import { BarChart3, IndianRupee, Receipt, UserRound, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAnalytics, type AnalyticsDays } from "@/lib/analytics"
import { formatCurrency } from "@/lib/format"
import { ErrorState } from '@/components/error-state'
import { StatCard } from '@/components/stats/stat-card'
import { RevenueChart } from '@/components/stats/revenue-chart'
import { TopItems } from '@/components/stats/top-items'
import { TopCustomers } from '@/components/stats/top-customers'
import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsPage() {
  const [days, setDays] = useState<AnalyticsDays>(7)
  const { data, isLoading, error, refetch, isFetching } = useAnalytics(days)

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="bg-white border-b border-stone-200 dark:bg-stone-900 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-6 w-6 text-stone-800 dark:text-stone-300" />
                <div className="h-1 w-12 bg-stone-800 dark:bg-stone-300" />
              </div>
              <h1
                className="text-4xl font-bold text-stone-900 mb-1 dark:text-stone-100"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Analytics
              </h1>
              <p className="text-stone-600 text-sm dark:text-stone-400">
                Sales performance and customer insights
              </p>
            </div>

            <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
              <Button
                size="sm"
                variant={days === 7 ? "default" : "ghost"}
                onClick={() => setDays(7)}
                className={days === 7 ? "bg-stone-800 dark:bg-stone-100 dark:text-stone-900" : ""}
                disabled={isFetching}
              >
                7 days
              </Button>
              <Button
                size="sm"
                variant={days === 30 ? "default" : "ghost"}
                onClick={() => setDays(30)}
                className={days === 30 ? "bg-stone-800 dark:bg-stone-100 dark:text-stone-900" : ""}
                disabled={isFetching}
              >
                30 days
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error || !data ? (
          <ErrorState
            title="Couldn't load analytics"
            message="The analytics couldn't be fetched. Check the backend and retry."
            onRetry={refetch}
          />
        ) : (
          <StatsSection data={data} />
        )}
      </div>
    </div>
  )
}

function StatsSection({
  data,
}: {
  data: NonNullable<ReturnType<typeof useAnalytics>["data"]>
}) {
  const totals = data.totals
  const today = data.daily_revenue.length
    ? data.daily_revenue[data.daily_revenue.length - 1]
    : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Revenue"
          value={formatCurrency(totals.revenue)}
          hint={today ? `Today: ${formatCurrency(today.revenue)}` : undefined}
          icon={IndianRupee}
        />
        <StatCard
          label="Sessions"
          value={String(totals.sessions)}
          hint={`${data.period.start_date} → ${data.period.end_date}`}
          icon={Users}
        />
        <StatCard
          label="Avg Bill"
          value={formatCurrency(totals.avg_bill)}
          hint={`${totals.orders} orders · ${totals.items_sold} items`}
          icon={Receipt}
        />
        <StatCard
          label="Unique Customers"
          value={String(totals.unique_customers)}
          hint={`${totals.repeat_customers} repeat · ${totals.new_customers} new`}
          icon={UserRound}
        />
      </div>

      <RevenueChart data={data.daily_revenue} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopItems items={data.top_items} />
        <TopCustomers customers={data.top_customers} />
      </div>
    </div>
  )
}
