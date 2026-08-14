'use client'
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, User, ChevronRight, Loader2 } from "lucide-react"
import { formatNepalTime, formatTimeElapsed } from "@/lib/format"
import { queryKeys } from "@/lib/query-keys"
import type { Table } from "@/types/table"
import { toast } from "sonner"

export function TableCard({ table }: { table: Table }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const createOrderMutation = useMutation({
    mutationFn: async (table_session_id: number) => {
      await api.post(`/table-sessions/${table_session_id}/orders`)
    },
  })

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ id: number }>("/table-sessions", {
        table_id: table.id,
      })
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables })
      createOrderMutation.mutate(data.id)
      router.push(`/table-session/${data.id}`)
    },
    onError: () => {
      toast.error("Couldn't start the session", {
        description: "Please try again.",
      })
    },
  })

  const isOccupied = table.is_occupied

  return (
    <Card
      className={`
      group relative overflow-hidden transition-all duration-300
      border-2 hover:shadow-lg
      ${
        isOccupied
          ? "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 hover:border-stone-300"
          : "bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 hover:border-stone-400"
      }
    `}
    >
      <div
        className={`h-1 w-full ${
          isOccupied ? "bg-stone-800 dark:bg-stone-200" : "bg-stone-400 dark:bg-stone-600"
        }`}
      />

      <div className="p-6 rounded-2xl">
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <h3
              className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {table.number}
            </h3>
            <div
              className={`h-2 w-2 rounded-full ${
                isOccupied
                  ? "bg-green-600 animate-pulse"
                  : "bg-stone-400 dark:bg-stone-600"
              }`}
            />
          </div>

          <p
            className={`text-xs uppercase tracking-widest font-semibold ${
              isOccupied
                ? "text-stone-800 dark:text-stone-200"
                : "text-stone-500 dark:text-stone-400"
            }`}
          >
            {isOccupied ? "In Service" : "Available"}
          </p>
        </div>

        {isOccupied ? (
          <div className="space-y-3 mb-6 pb-6 border-b border-stone-200 dark:border-stone-700 min-h-[88px]">
            {table.customer_name && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
                <span className="text-sm text-stone-700 dark:text-stone-300 font-medium">
                  {table.customer_name}
                </span>
              </div>
            )}
            {table.customer_arrival && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
                  <span className="text-sm text-stone-600 dark:text-stone-400">
                    {formatNepalTime(table.customer_arrival)}
                  </span>
                </div>
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  {formatTimeElapsed(table.customer_arrival)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 pb-6 min-h-[88px] flex items-center justify-center">
            <p className="text-sm text-stone-500 dark:text-stone-400 italic">
              Ready for guests
            </p>
          </div>
        )}

        {isOccupied ? (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-2 border-stone-800 dark:border-stone-200 text-stone-800 dark:text-stone-200 hover:bg-stone-800 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-900 transition-all font-semibold group/btn"
              onClick={() => router.push(`/table-session/${table.active_session_id}`)}
            >
              View Orders
              <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all font-medium"
              onClick={() => router.push(`/checkout/${table.active_session_id}`)}
            >
              Checkout
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            className="w-full bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 font-semibold transition-all"
            onClick={() => createSessionMutation.mutate()}
            disabled={createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              "Start Session"
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}
