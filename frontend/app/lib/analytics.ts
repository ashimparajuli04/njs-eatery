import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"

export interface AnalyticsPeriod {
  days: number
  start_date: string
  end_date: string
}

export interface AnalyticsTotals {
  revenue: number
  sessions: number
  orders: number
  items_sold: number
  avg_bill: number
  unique_customers: number
  repeat_customers: number
  new_customers: number
}

export interface DailyRevenue {
  date: string
  revenue: number
  sessions: number
}

export interface TopItem {
  name: string
  quantity: number
  revenue: number
}

export interface TopCustomer {
  name: string
  phone_number: string
  visits: number
  total_spent: number
}

export interface AnalyticsSummary {
  period: AnalyticsPeriod
  totals: AnalyticsTotals
  daily_revenue: DailyRevenue[]
  top_items: TopItem[]
  top_customers: TopCustomer[]
}

export type AnalyticsDays = 7 | 30

export function useAnalytics(days: AnalyticsDays = 7) {
  return useQuery({
    queryKey: queryKeys.analytics(days),
    queryFn: async () =>
      (
        await api.get<AnalyticsSummary>("/analytics/summary", {
          params: { days },
        })
      ).data,
  })
}
