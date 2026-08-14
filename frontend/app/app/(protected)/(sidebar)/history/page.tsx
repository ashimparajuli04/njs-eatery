'use client'
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Clock, User, UtensilsCrossed, Calendar, Receipt, Eye, Trash } from "lucide-react"
import { useAuth } from "@/providers/auth-provider"
import { LoadingView } from "@/components/loading"
import { ErrorState } from "@/components/error-state"
import { EmptyState } from "@/components/empty-state"
import { useSessionHistory } from "@/lib/hooks"
import { queryKeys } from "@/lib/query-keys"
import {
  formatCurrency,
  formatDuration,
  formatNepalDate,
  formatNepalTime,
} from "@/lib/format"
import { toast } from "sonner"

export default function HistoryPage() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data, isLoading, error, refetch } = useSessionHistory(currentPage, pageSize)

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.sessionHistory(currentPage, pageSize),
    })

  const deleteSessionMutation = useMutation({
    mutationFn: (table_session_id: number) =>
      api.delete(`/table-sessions/${table_session_id}`),
    onSuccess: () => {
      invalidate()
      toast.success("Session deleted")
    },
    onError: () => {
      toast.error("Couldn't delete the session", {
        description: "Please try again.",
      })
    },
  })

  if (isLoading) {
    return <LoadingView label="table session history" />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-4">
        <ErrorState
          title="Couldn't load session history"
          onRetry={refetch}
        />
      </div>
    )
  }

  const totalPages = data?.total_pages || 1

  const renderPaginationItems = () => {
    if (!data) return null

    const items = []
    const current = currentPage

    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          onClick={() => setCurrentPage(1)}
          isActive={current === 1}
          className="cursor-pointer"
        >
          1
        </PaginationLink>
      </PaginationItem>
    )

    if (current > 3) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      )
    }

    for (
      let i = Math.max(2, current - 1);
      i <= Math.min(totalPages - 1, current + 1);
      i++
    ) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setCurrentPage(i)}
            isActive={current === i}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }

    if (current < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      )
    }

    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => setCurrentPage(totalPages)}
            isActive={current === totalPages}
            className="cursor-pointer"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }

    return items
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 rounded-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Receipt className="h-6 w-6 text-stone-800 dark:text-stone-300" />
            <div className="h-1 w-12 bg-stone-800 dark:bg-stone-300" />
          </div>
          <h1
            className="text-4xl font-bold text-stone-900 dark:text-stone-100 mb-1"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Session History
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm">
            {data?.total || 0} completed sessions
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
        {data && data.items.length > 0 ? (
          <div className="space-y-4 mb-12">
            {data.items.map((session) => (
              <Card
                key={session.id}
                className="border-2 border-stone-200 dark:border-stone-700 hover:border-stone-300 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2 text-stone-900 dark:text-stone-100">
                        <UtensilsCrossed className="h-5 w-5 text-stone-600 dark:text-stone-400" />
                        <span style={{ fontFamily: "Georgia, serif" }}>
                          Table Session #{session.id}
                        </span>
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600 dark:text-stone-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {formatNepalDate(session.ended_at)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatNepalTime(session.started_at)}
                        </div>
                        <span className="text-stone-400 dark:text-stone-600">—</span>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatNepalTime(session.ended_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 font-semibold"
                      >
                        Completed
                      </Badge>
                      <div className="text-right">
                        <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                          Total Bill
                        </p>
                        <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                          {formatCurrency(session.final_bill)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-stone-50 dark:bg-stone-900/60 rounded-lg border border-stone-200 dark:border-stone-800">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                      <div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                          Customer
                        </p>
                        <p className="font-medium text-sm text-stone-900 dark:text-stone-100">
                          {session.customer_name || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                      <div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                          Duration
                        </p>
                        <p className="font-medium text-sm text-stone-900 dark:text-stone-100">
                          {formatDuration(session.started_at, session.ended_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                      <div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                          Session ID
                        </p>
                        <p className="font-medium text-sm text-stone-900 dark:text-stone-100">
                          #{session.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 col-span-2 lg:col-start-4 lg:col-span-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-stone-800 dark:border-stone-200 text-stone-800 dark:text-stone-200 hover:bg-stone-800 hover:text-white dark:hover:bg-stone-100 dark:hover:text-stone-900 transition-all font-semibold"
                        onClick={() => router.push(`/table-session/${session.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>

                      {user?.role !== "admin" ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled
                                  className="opacity-50 cursor-not-allowed"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Admin access required</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="font-semibold">
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent className="border-stone-200 dark:border-stone-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-stone-900 dark:text-stone-100">
                                Are you absolutely sure?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-stone-600 dark:text-stone-400">
                                This action cannot be undone. This will permanently delete the
                                table session from the database.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteSessionMutation.mutate(session.id)}
                                disabled={deleteSessionMutation.isPending}
                              >
                                {deleteSessionMutation.isPending &&
                                deleteSessionMutation.variables === session.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Receipt}
            title="No session history"
            description="Completed sessions will appear here."
          />
        )}

        {data && data.total_pages > 1 && (
          <div className="flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(data.total_pages, p + 1))
                    }
                    className={
                      currentPage === data.total_pages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  )
}
